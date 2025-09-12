const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const router = express.Router();
const { getGlobalModels } = require("../db/globalConnection");
const { getTenantModels } = require("../model/tenantModels");
const globalAuthMiddleware = require("../middlewares/globalAuthMiddleware");
const tenantMiddleware = require("../middlewares/tenantMiddleware");
const { getTenantConnection } = require("../db/connectionManager");


const saltRounds = 10;

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      userName: user.userName,
      tenantId: user.tenantId,
    },
    process.env.SECRET_KEY,
    { expiresIn: "7d" }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      type: "refresh",
    },
    process.env.SECRET_KEY,
    { expiresIn: "30d" }
  );
};

router.post("/login", async (req, res) => {
  const { userName, password } = req.body;

  try {
    if (!userName || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    const { GlobalUser } = await getGlobalModels();

    const user = await GlobalUser.findOne({
      userName: userName.toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Please contact support.",
      });
    }

    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(403).json({
        success: false,
        message: `Account is locked until ${new Date(
          user.lockUntil
        ).toLocaleString()}`,
      });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      user.loginAttempts += 1;

      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
      }

      await user.save();

      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
        attemptsRemaining: Math.max(0, 5 - user.loginAttempts),
      });
    }

    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    const tenantModels = await getTenantModels(user.tenantDatabase);
    const tenantUser = await tenantModels.User.findOne({
      userName: user.userName,
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      refreshToken,
      user: {
        id: user._id,
        userName: user.userName,
        tenantId: user.tenantId,
        isSuperAdmin: user.isSuperAdmin,
        metadata: user.metadata,
        role: tenantUser?.role || "user",
        permissions: tenantUser?.permissions || {},
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
      error: error.message,
    });
  }
});


router.post("/register", async (req, res) => {
  const {
    userName,
    password,
    tenantId,
    tenantName,
    firstName,
    lastName,
    phone,
  } = req.body;

  try {
    if (!userName || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    const { GlobalUser, Tenant } = await getGlobalModels();

    const existingUser = await GlobalUser.findOne({
      $or: [{ userName: userName.toLowerCase() }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Username already exists",
      });
    }

    let tenant;
    let isNewTenant = false;

    if (tenantId) {
      tenant = await Tenant.findOne({ tenantId });
      if (!tenant) {
        return res.status(400).json({
          success: false,
          message: "Invalid tenant ID",
        });
      }
    } else if (tenantName) {
      const existingTenant = await Tenant.findOne({
        tenantName: tenantName,
      });

      if (existingTenant) {
        return res.status(400).json({
          success: false,
          message: "Tenant name already exists",
        });
      }

      const newTenantId = tenantName.toLowerCase().replace(/\s+/g, "_");
      const databaseName = `tenant_${newTenantId}`;

      tenant = new Tenant({
        tenantId: newTenantId,
        tenantName: tenantName,
        databaseName: databaseName,
        plan: "trial",
        subscription: {
          status: "trial",
          startDate: new Date(),
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      });

      await tenant.save();
      isNewTenant = true;
    } else {
      return res.status(400).json({
        success: false,
        message: "Either tenantId or tenantName is required",
      });
    }

    const globalUser = new GlobalUser({
      userName: userName.toLowerCase(),
      password: password,
      tenantId: tenant.tenantId,
      tenantDatabase: tenant.databaseName,
      isSuperAdmin: isNewTenant,
      metadata: {
        firstName,
        lastName,
        phone,
      },
    });

    await globalUser.save();

    const tenantModels = await getTenantModels(tenant.databaseName);
    const hashedPassword = await bcrypt.hash(password, 10);

    const tenantUserData = {
      userName: userName.toLowerCase(),
      password: hashedPassword,
      role: isNewTenant ? "developer" : "manager",
      permissions: isNewTenant ? generateAllPermissions(true) : {},
    };

    const tenantUser = new tenantModels.User(tenantUserData);
    await tenantUser.save();

    const token = generateToken(globalUser);
    const refreshToken = generateRefreshToken(globalUser);

    globalUser.refreshToken = refreshToken;
    await globalUser.save();

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      refreshToken,
      user: {
        id: globalUser._id,
        userName: globalUser.userName,
        tenantId: globalUser.tenantId,
        isSuperAdmin: globalUser.isSuperAdmin,
        metadata: globalUser.metadata,
        role: tenantUser.role,
        permissions: tenantUser.permissions,
      },
      tenant: isNewTenant
        ? {
            id: tenant._id,
            tenantId: tenant.tenantId,
            tenantName: tenant.tenantName,
            plan: tenant.plan,
          }
        : undefined,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: error.message,
    });
  }
});

router.post("/create-tenant-user", async (req, res) => {
  const { userName, password, role, tenantId } = req.body;

  try {
    if (!userName || !password || !role || !tenantId) {
      return res.status(400).json({ success: false, message: "Required fields missing" });
    }

    const { GlobalUser, Tenant } = await getGlobalModels();
    const tenant = await Tenant.findOne({ tenantId });
    if (!tenant) return res.status(400).json({ success: false, message: "Tenant not found" });



    // Check for duplicate username/email
    const existingGlobal = await GlobalUser.findOne({
      $or: [{ userName: userName.toLowerCase() }],
    });
    if (existingGlobal) return res.status(400).json({ success: false, message: "User already exists" });

    const globalUser = new GlobalUser({
      userName: userName.toLowerCase(),
      password: password, // store plain, hashed in tenant DB
      tenantId: tenant.tenantId,
      tenantDatabase: tenant.databaseName,
      isSuperAdmin: false,
    });

    await globalUser.save();

    // Tenant DB user
    const tenantModels = await getTenantModels(tenant.databaseName);
    const hashedPassword = await bcrypt.hash(password, 10);

    const tenantUser = new tenantModels.User({
      userName: userName.toLowerCase(),
      password: hashedPassword,
      role,
      permissions: role === "manager" ? generateAllPermissions(false) : {},
    });

    await tenantUser.save();

    res.status(201).json({
      success: true,
      message: "Tenant user created successfully",
      user: {
        id: globalUser._id,
        userName: globalUser.userName,
        tenantId: globalUser.tenantId,
        role: tenantUser.role,
      },
    });
  } catch (err) {
    console.error("Create tenant user error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});


router.post("/refresh-token", async (req, res) => {
  const { refreshToken } = req.body;

  try {
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.SECRET_KEY);

    if (decoded.type !== "refresh") {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const { GlobalUser } = await getGlobalModels();
    const user = await GlobalUser.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    user.refreshToken = newRefreshToken;
    await user.save();

    res.status(200).json({
      success: true,
      token: newToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token",
    });
  }
});

router.post("/logout", globalAuthMiddleware, async (req, res) => {
  try {
    const { GlobalUser } = await getGlobalModels();

    await GlobalUser.findByIdAndUpdate(req.globalUser._id, {
      refreshToken: null,
    });

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during logout",
    });
  }
});

router.get("/me", globalAuthMiddleware, async (req, res) => {
  try {
    const tenantModels = await getTenantModels(req.globalUser.tenantDatabase);
    const tenantUser = await tenantModels.User.findOne({
      userName: req.globalUser.userName,
    });

    res.status(200).json({
      success: true,
      user: {
        id: req.globalUser._id,
        userName: req.globalUser.userName,
        tenantId: req.globalUser.tenantId,
        isSuperAdmin: req.globalUser.isSuperAdmin,
        metadata: req.globalUser.metadata,
        role: tenantUser?.role || "user",
        permissions: tenantUser?.permissions || {},
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

router.get("/count", async (req, res) => {
  try {
    const { GlobalUser } = await getGlobalModels(); // global user model
    const userCount = await GlobalUser.countDocuments();
    res.status(200).json({ success: true, userCount });
  } catch (error) {
    console.error("Error fetching user count:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching user count" });
  }
});

// PUT /auth/:id → update user role & permissions
router.put("/:id", globalAuthMiddleware, async (req, res) => {
  try {
    const tenantId = req.globalUser?.tenantId || req.headers["x-tenant-id"];
    if (!tenantId) {
      return res.status(400).json({ message: "Tenant ID missing" });
    }

    const { Tenant } = await getGlobalModels();
    const tenant = await Tenant.findOne({ tenantId });
    if (!tenant) return res.status(400).json({ message: "Invalid tenant ID" });

    const tenantDbName = tenant.databaseName;

    const connection = await getTenantConnection(tenantDbName);

    const User =
      connection.model("User") || connection.model("User", userSchema);

    const { id } = req.params;
    const { role, permissions } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { role, permissions },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ success: true, user: updatedUser });
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ message: "Failed to update user" });
  }
});




function generateAllPermissions(isAllowed) {
  const crudPermission = {
    trigger: isAllowed,
    view: isAllowed,
    add: isAllowed,
    edit: isAllowed,
    delete: isAllowed,
  };

  return {
    sales: {
      trigger: isAllowed,
      retailSale: { ...crudPermission },
      wholeSale: { ...crudPermission },
      transactions: { ...crudPermission },
      quotations: { ...crudPermission },
    },
    inventory: {
      trigger: isAllowed,
      categories: { ...crudPermission },
      products: { ...crudPermission },
      alertItems: { ...crudPermission },
    },
    purchase: {
      trigger: isAllowed,
      purchase: { ...crudPermission },
    },
    customers: {
      trigger: isAllowed,
      customers: { ...crudPermission },
    },
    supplier: {
      trigger: isAllowed,
      supplier: { ...crudPermission },
    },
    expense: {
      trigger: isAllowed,
      expense: { ...crudPermission },
    },
    accounts: {
      trigger: isAllowed,
      accounts: { ...crudPermission },
    },
    employee: {
      trigger: isAllowed,
      employee: { ...crudPermission },
    },
    report: {
      trigger: isAllowed,
      report: { ...crudPermission },
    },
    settings: {
      trigger: isAllowed,
      settings: { ...crudPermission },
    },
    usersAndPermission: {
      trigger: isAllowed,
      userManagement: { ...crudPermission },
    },
  };
}


module.exports = router;
