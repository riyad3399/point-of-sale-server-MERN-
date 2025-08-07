const express = require("express");
const router = express.Router();
const { getGlobalModels } = require("../db/globalConnection");
const { getTenantModels, clearModelCache } = require("../model/tenantModels");
const { closeTenantConnection } = require("../db/connectionManager");
const globalAuthMiddleware = require("../middlewares/globalAuthMiddleware");

const isSuperAdmin = (req, res, next) => {
  if (!req.globalUser.isSuperAdmin) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Super admin privileges required.",
    });
  }
  next();
};

router.use(globalAuthMiddleware);

router.get("/tenants", isSuperAdmin, async (req, res) => {
  try {
    const { Tenant } = await getGlobalModels();
    
    const tenants = await Tenant.find()
      .select("-__v")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tenants.length,
      tenants,
    });
  } catch (error) {
    console.error("Get tenants error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tenants",
      error: error.message,
    });
  }
});

router.get("/tenants/:tenantId", isSuperAdmin, async (req, res) => {
  try {
    const { Tenant, GlobalUser } = await getGlobalModels();
    
    const tenant = await Tenant.findOne({ 
      tenantId: req.params.tenantId 
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found",
      });
    }

    const userCount = await GlobalUser.countDocuments({ 
      tenantId: tenant.tenantId 
    });

    const tenantModels = await getTenantModels(tenant.databaseName);
    
    const stats = {
      products: await tenantModels.Product.countDocuments(),
      customers: await tenantModels.Customer.countDocuments(),
      invoices: await tenantModels.Invoice.countDocuments(),
      suppliers: await tenantModels.Supplier.countDocuments(),
    };

    res.status(200).json({
      success: true,
      tenant: {
        ...tenant.toObject(),
        userCount,
        stats,
      },
    });
  } catch (error) {
    console.error("Get tenant details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tenant details",
      error: error.message,
    });
  }
});

router.put("/tenants/:tenantId", isSuperAdmin, async (req, res) => {
  try {
    const { Tenant } = await getGlobalModels();
    const updates = req.body;

    const allowedUpdates = [
      "tenantName",
      "plan",
      "features",
      "subscription",
      "billing",
      "settings",
      "isActive",
    ];

    const updateKeys = Object.keys(updates);
    const isValidUpdate = updateKeys.every(key => 
      allowedUpdates.includes(key)
    );

    if (!isValidUpdate) {
      return res.status(400).json({
        success: false,
        message: "Invalid update fields",
      });
    }

    const tenant = await Tenant.findOneAndUpdate(
      { tenantId: req.params.tenantId },
      updates,
      { new: true, runValidators: true }
    );

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Tenant updated successfully",
      tenant,
    });
  } catch (error) {
    console.error("Update tenant error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update tenant",
      error: error.message,
    });
  }
});

router.post("/tenants/:tenantId/suspend", isSuperAdmin, async (req, res) => {
  try {
    const { Tenant, GlobalUser } = await getGlobalModels();
    
    const tenant = await Tenant.findOneAndUpdate(
      { tenantId: req.params.tenantId },
      { 
        isActive: false,
        "subscription.status": "suspended",
      },
      { new: true }
    );

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found",
      });
    }

    await GlobalUser.updateMany(
      { tenantId: tenant.tenantId },
      { isActive: false }
    );

    clearModelCache(tenant.databaseName);
    await closeTenantConnection(tenant.databaseName);

    res.status(200).json({
      success: true,
      message: "Tenant suspended successfully",
      tenant,
    });
  } catch (error) {
    console.error("Suspend tenant error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to suspend tenant",
      error: error.message,
    });
  }
});

router.post("/tenants/:tenantId/activate", isSuperAdmin, async (req, res) => {
  try {
    const { Tenant, GlobalUser } = await getGlobalModels();
    
    const tenant = await Tenant.findOneAndUpdate(
      { tenantId: req.params.tenantId },
      { 
        isActive: true,
        "subscription.status": "active",
      },
      { new: true }
    );

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found",
      });
    }

    await GlobalUser.updateMany(
      { tenantId: tenant.tenantId },
      { isActive: true }
    );

    res.status(200).json({
      success: true,
      message: "Tenant activated successfully",
      tenant,
    });
  } catch (error) {
    console.error("Activate tenant error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to activate tenant",
      error: error.message,
    });
  }
});

router.get("/users", isSuperAdmin, async (req, res) => {
  try {
    const { GlobalUser } = await getGlobalModels();
    
    const { tenantId, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const query = tenantId ? { tenantId } : {};

    const users = await GlobalUser.find(query)
      .select("-password -refreshToken -passwordResetToken")
      .populate("tenantId", "tenantName")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await GlobalUser.countDocuments(query);

    res.status(200).json({
      success: true,
      users,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
});

router.get("/stats", isSuperAdmin, async (req, res) => {
  try {
    const { Tenant, GlobalUser } = await getGlobalModels();
    
    const stats = {
      totalTenants: await Tenant.countDocuments(),
      activeTenants: await Tenant.countDocuments({ isActive: true }),
      suspendedTenants: await Tenant.countDocuments({ isActive: false }),
      totalUsers: await GlobalUser.countDocuments(),
      activeUsers: await GlobalUser.countDocuments({ isActive: true }),
      plans: await Tenant.aggregate([
        {
          $group: {
            _id: "$plan",
            count: { $sum: 1 },
          },
        },
      ]),
      recentTenants: await Tenant.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("tenantId tenantName plan createdAt"),
    };

    res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
      error: error.message,
    });
  }
});

module.exports = router;