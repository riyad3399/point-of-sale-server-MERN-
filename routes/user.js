const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const router = express.Router();
const User = require("../schemas/userSchema");
const authorizeRoles = require("../middlewares/authorizeRoles");
const rolePriority = require("../utils/rolePriority");
const allowRegisterIfNoUser = require("../middlewares/allowRegisterIfNoUser ");
const saltRounds = 10;



const getMaxRoleLevel = (roles = []) => {
  return roles.reduce((max, role) => {
    const level = rolePriority[role] ?? -1; // যদি rolePriority তে না থাকে
    return Math.max(max, level);
  }, -1);
};


// POST - User Register
router.post("/register", allowRegisterIfNoUser, async (req, res) => {
  const { userName, password, roles = [] } = req.body;

  try {
    const existingUser = await User.findOne({ userName });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    const userCount = await User.countDocuments();

    // Prevent second developer
    if (userCount > 0 && roles.includes("developer")) {
      const developerExists = await User.findOne({ roles: "developer" });
      if (developerExists) {
        return res.status(403).json({
          success: false,
          message: "Developer role is already assigned to another user.",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Final roles decision
    let finalRoles = [];

    if (userCount === 0) {
      finalRoles = ["developer"];
    } else if (roles.length > 0) {
      finalRoles = roles;
    } else {
      finalRoles = ["manager"];
    }

    const newUser = new User({
      userName,
      password: hashedPassword,
      roles: finalRoles,
    });

    const savedUser = await newUser.save();

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: {
        id: savedUser._id,
        userName: savedUser.userName,
        roles: savedUser.roles,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
});



// POST - User Login
router.post("/login", async (req, res) => {
  const { userName, password } = req.body;

  try {
    const existingUser = await User.findOne({ userName });

    if (!existingUser) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const isPasswordMatch = await bcrypt.compare(
      password,
      existingUser.password
    );
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password",
      });
    }

    const payload = {
      id: existingUser._id,
      userName: existingUser.userName,
      roles: existingUser.roles,
    };
    
    const token = jwt.sign(
      payload,
      process.env.SECRET_KEY || "your_jwt_secret",
      {
        expiresIn: "1d",
      }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token: "Bearer " + token,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// POST - role change (admin and developer)
router.post(
  "/:id/roles",
  passport.authenticate("jwt", { session: false }),
  authorizeRoles("admin", "developer"), // শুধু admin বা developer পারবে
  async (req, res) => {
    const { id } = req.params;
    const { roles: newRoles } = req.body; // admin assign করতে চায়

    try {
      const targetUser = await User.findById(id);
      if (!targetUser) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const requester = req.user;

      // ⚠️ এখানে ব্যবহার হচ্ছে getMaxRoleLevel()
      const requesterMaxLevel = getMaxRoleLevel(requester.roles); // যেমন developer = 3
      const targetMaxLevel = getMaxRoleLevel(newRoles); // নতুন role যেমন admin = 2

      // এখন compare করা হচ্ছে
      if (requesterMaxLevel < targetMaxLevel) {
        return res.status(403).json({
          success: false,
          message: "You cannot assign a role higher than your own",
        });
      }

      // ✅ role change অনুমোদন পেলে
      targetUser.roles = newRoles;
      await targetUser.save();

      res.status(200).json({
        success: true,
        message: "Roles updated successfully",
        user: {
          id: targetUser._id,
          userName: targetUser.userName,
          roles: targetUser.roles,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);



// GET - profile route
router.get(
  "/profile",
  passport.authenticate("jwt", { session: false }),
  authorizeRoles("admin", "manager", "developer"),
  (req, res) => {
    const { _id, userName, roles } = req.user;
    res.status(200).json({
      success: true,
      user: {
        id: _id,
        userName,
        roles,
      },
    });
  }
);


// GET - users
router.get(
  "/users",
  passport.authenticate("jwt", { session: false }),
  authorizeRoles("admin", "developer"),
  async (req, res) => {
    try {
      const users = await User.find({}, "userName roles"); // শুধু দরকারি info
      res.json({ users });
    } catch (err) {
      res.status(500).json({ message: "Failed to load users" });
    }
  }
);

// ✅ Get user count
router.get("/count", async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    res.json({ userCount });
  } catch (error) {
    res.status(500).json({ message: "Error fetching user count" });
  }
});

// POST - User logout
router.post("/logout", (req, res) => {
  res.status(200).json({
    sucess: true,
    message: "User Logout Successfull",
  });
});

module.exports = router;
