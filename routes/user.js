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

const ALL_PERMISSIONS = require("../constants/permissions");



const getMaxRoleLevel = (roles = []) => {
  return roles.reduce((max, role) => {
    const level = rolePriority[role] ?? -1; // যদি rolePriority তে না থাকে
    return Math.max(max, level);
  }, -1);
};


// POST - User Register
// router.post("/register", allowRegisterIfNoUser, async (req, res) => {
//   const { userName, password, role = "" } = req.body; // role singular

//   try {
//     const existingUser = await User.findOne({ userName });
//     if (existingUser) {
//       return res
//         .status(400)
//         .json({ success: false, message: "User already exists" });
//     }

//     const userCount = await User.countDocuments();

//     // ❌ Prevent second developer
//     if (userCount > 0 && role === "developer") {
//       const developerExists = await User.findOne({ role: "developer" });
//       if (developerExists) {
//         return res.status(403).json({
//           success: false,
//           message: "Developer role is already assigned to another user.",
//         });
//       }
//     }

//     const hashedPassword = await bcrypt.hash(password, saltRounds);

//     // ✅ Final role
//     let finalRole = "";
//     if (userCount === 0) {
//       finalRole = "developer";
//     } else if (role) {
//       finalRole = role;
//     } else {
//       finalRole = "manager";
//     }

//     let permissions = {};
//     if (finalRole === "developer") {
//       permissions = ALL_PERMISSIONS;
//     }

//     const newUser = new User({
//       userName,
//       password: hashedPassword,
//       role: finalRole, // singular role field
//       permissions,
//     });

//     const savedUser = await newUser.save();

//     res.status(201).json({
//       success: true,
//       message: "User created successfully",
//       user: {
//         id: savedUser._id,
//         userName: savedUser.userName,
//         role: savedUser.role,
//         permissions: savedUser.permissions,
//       },
//     });
//   } catch (error) {
//     console.error("Register error:", error.message);
//     res.status(500).json({
//       success: false,
//       message: "Server Error",
//       error: error.message,
//     });
//   }
// });
router.post("/register", allowRegisterIfNoUser, async (req, res) => {
  const { userName, password, role = "" } = req.body;

  try {
    const existingUser = await User.findOne({ userName });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    const userCount = await User.countDocuments();

    // ❌ Prevent second developer
    if (userCount > 0 && role === "developer") {
      const developerExists = await User.findOne({ role: "developer" });
      if (developerExists) {
        return res.status(403).json({
          success: false,
          message: "Developer role is already assigned to another user.",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // ✅ Final role
    let finalRole = "";
    if (userCount === 0) {
      finalRole = "developer";
    } else if (role) {
      finalRole = role;
    } else {
      finalRole = "manager";
    }

    // ✅ Build permission object
    const deepClonePermissions = (template, value) => {
      const result = {};
      for (const key in template) {
        if (typeof template[key] === "object" && template[key] !== null) {
          result[key] = deepClonePermissions(template[key], value);
        } else {
          result[key] = value;
        }
      }
      return result;
    };

    let permissions = {};
    if (finalRole === "developer") {
      permissions = ALL_PERMISSIONS;
    } else {
      permissions = deepClonePermissions(ALL_PERMISSIONS, false);
    }

    const newUser = new User({
      userName,
      password: hashedPassword,
      role: finalRole,
      permissions,
    });

    const savedUser = await newUser.save();

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: {
        id: savedUser._id,
        userName: savedUser.userName,
        role: savedUser.role,
        permissions: savedUser.permissions,
      },
    });
  } catch (error) {
    console.error("Register error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
});


// PUT - A User (update user role and permission)
const ALLOWED_ROLES = ["admin", "manager", "user"]; 

router.put("/:id", async (req, res) => {
  const { role, permissions } = req.body;

  if (!role || typeof role !== "string" || !ALLOWED_ROLES.includes(role)) {
    return res.status(400).json({ message: "Invalid or missing role" });
  }

  if (
    !permissions ||
    typeof permissions !== "object" ||
    Array.isArray(permissions)
  ) {
    return res.status(400).json({ message: "Invalid permissions format" });
  }

  const isValidPermissionStructure = (perm) => {
    const crudKeys = ["view", "add", "edit", "delete"];

    for (const group in perm) {
      const section = perm[group];

      if (typeof section.trigger !== "boolean") {
        return false;
      }

      for (const module in section) {
        if (module === "trigger") continue;

        const actions = section[module];
        for (const key of crudKeys) {
          if (typeof actions[key] !== "boolean") {
            return false;
          }
        }
      }
    }
    return true;
  };

  if (!isValidPermissionStructure(permissions)) {
    return res.status(400).json({ message: "Invalid permission structure" });
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { role, permissions },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user: updatedUser });
  } catch (err) {
    console.error("User update error:", err);
    res.status(500).json({ message: "Failed to update user" });
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

    // ✅ Include roles and permissions in payload
    const payload = {
      id: existingUser._id,
      userName: existingUser.userName,
      role: existingUser.role,
      permissions: existingUser.permissions || {}, // optional fallback
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



// POST - role change (just developer)
router.post(
  "/:id/roles",
  passport.authenticate("jwt", { session: false }),
  authorizeRoles("developer"),
  async (req, res) => {
    const { id } = req.params;
    const { roles: newRoles } = req.body;

    try {
      const targetUser = await User.findById(id);
      if (!targetUser) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const requester = req.user;

      const requesterMaxLevel = getMaxRoleLevel(requester.roles);
      const targetMaxLevel = getMaxRoleLevel(newRoles);

      // ✅ Check: developer role কি assign করা হচ্ছে?
      if (newRoles.includes("developer")) {
        // ✅ অন্য কেউ কি আগে থেকেই developer role এ আছে?
        const existingDeveloper = await User.findOne({
          roles: "developer",
          _id: { $ne: id }, // নিজেকে বাদ দিয়ে অন্য কাউকে খুঁজে
        });

        if (existingDeveloper) {
          return res.status(403).json({
            success: false,
            message: "Only one developer is allowed in the system.",
          });
        }
      }

      if (requesterMaxLevel < targetMaxLevel) {
        return res.status(403).json({
          success: false,
          message: "You cannot assign a role higher than your own",
        });
      }

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

// POST - permission change (just developer)
router.post(
  "/:id/permissions",
  passport.authenticate("jwt", { session: false }),
  authorizeRoles("developer"), // শুধু developer permission change করতে পারবে
  async (req, res) => {
    const { id } = req.params;
    const { permissions } = req.body;

    try {
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      user.permissions = permissions || [];
      await user.save();

      res.status(200).json({
        success: true,
        message: "Permissions updated successfully",
        user: {
          _id: user._id,
          userName: user.userName,
          roles: user.roles,
          permissions: user.permissions,
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
    const { _id, userName, role } = req.user; 

    res.status(200).json({
      success: true,
      user: {
        id: _id,
        userName,
        role, 
      },
    });
  }
);



// GET - all users
router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  authorizeRoles("admin", "developer"),
  async (req, res) => {
    try {
      const users = await User.find({}, "userName roles permissions"); 
      res.json({ users });
    } catch (err) {
      res.status(500).json({ message: "Failed to load users" });
    }
  }
);

//  Get user count
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
