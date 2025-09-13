const express = require("express");
const bcrypt = require("bcrypt");

const router = express.Router();

const { getTenantModels } = require("../model/tenantModels");
const { getGlobalModels } = require("../db/globalConnection");

// create user
router.post("/:tenantId", async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { userName, password, role } = req.body;

    // 1. Tenant খুঁজে বের করা (Global DB থেকে)
    const { Tenant } = await getGlobalModels();
    const tenant = await Tenant.findOne({ tenantId });

    if (!tenant) {
      return res
        .status(404)
        .json({ success: false, message: "Tenant not found" });
    }

    // 2. Tenant DB models নেয়া
    const tenantModels = await getTenantModels(tenant.databaseName);

    // 3. Duplicate check
    const existingUser = await tenantModels.User.findOne({
      userName: userName.toLowerCase(),
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists in tenant DB" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. User Data তৈরি করা
    const tenantUser = new tenantModels.User({
      userName: userName.toLowerCase(),
      password: hashedPassword,
      role: role || "staff",
      permissions:
        role === "developer"
          ? generateAllPermissions(true)
          : generateAllPermissions(false),
    });

    // 5. Save করা
    await tenantUser.save();

    res.status(201).json({
      success: true,
      message: "Tenant user created successfully",
      user: tenantUser,
    });
  } catch (error) {
    console.error("Tenant User Creation Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// fetch user
router.get("/:tenantId", async (req, res) => {
  try {
    const { tenantId } = req.params;

    // tenant database access
    const { Tenant } = await getGlobalModels();
    const tenant = await Tenant.findOne({ tenantId });
    if (!tenant) {
      return res
        .status(404)
        .json({ success: false, message: "Tenant not found" });
    }

    const tenantModels = await getTenantModels(tenant.databaseName);
    const users = await tenantModels.User.find().select("-password");

    res.status(200).json({
      success: true,
      tenantId: tenant.tenantId,
      users,
    });
  } catch (error) {
    console.error("Tenant Users Fetch Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching tenant users",
      error: error.message,
    });
  }
});

router.delete("/:tenantId/delete/:userId", async (req, res) => {
  try {
    const { tenantId, userId } = req.params;
    const { userName } = req.body;

    // 1️⃣ Global database থেকে tenant check
    const { Tenant, GlobalUser } = await getGlobalModels();
    const tenant = await Tenant.findOne({ tenantId });
    if (!tenant) {
      return res
        .status(404)
        .json({ success: false, message: "Tenant not found" });
    }

    const tenantModels = await getTenantModels(tenant.databaseName);

    const tenantUser = await tenantModels.User.findById(userId);
    if (!tenantUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (tenantUser.role === "developer") {
      return res
        .status(403)
        .json({
          success: false,
          message: "Developer role users cannot be deleted",
        });
    }

    const deletedTenantUser = await tenantModels.User.findByIdAndDelete(userId);

    const deletedGlobalUser = await GlobalUser.findOneAndDelete({
      userName: userName.toLowerCase(),
      tenantId,
    });

    res.status(200).json({
      success: true,
      message: "User deleted successfully from tenant and global database",
      tenantUser: deletedTenantUser,
      globalUser: deletedGlobalUser,
    });
  } catch (error) {
    console.error("Delete Tenant & Global User Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting user",
      error: error.message,
    });
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
