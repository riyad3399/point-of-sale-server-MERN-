const { getTenantModels } = require("../model/tenantModels");
const { getGlobalModels } = require("../db/globalConnection");

const tenantMiddleware = async (req, res, next) => {
  try {
    let tenantDatabase = null;
    let tenantId = null;

    if (req.globalUser) {
      tenantDatabase = req.globalUser.tenantDatabase;
      tenantId = req.globalUser.tenantId;
    } else if (req.headers["x-tenant-id"]) {
      const { Tenant } = await getGlobalModels();
      const tenant = await Tenant.findOne({ 
        tenantId: req.headers["x-tenant-id"] 
      });
      
      if (!tenant) {
        return res.status(400).json({ 
          success: false,
          error: "Invalid tenant ID" 
        });
      }

      if (!tenant.isActive) {
        return res.status(403).json({ 
          success: false,
          error: "Tenant account is inactive" 
        });
      }

      tenantDatabase = tenant.databaseName;
      tenantId = tenant.tenantId;
    } else {
      return next();
    }

    if (!tenantDatabase) {
      return res.status(400).json({ 
        success: false,
        error: "Tenant database not found" 
      });
    }

    req.tenantId = tenantId;
    req.tenantDatabase = tenantDatabase;
    req.models = await getTenantModels(tenantDatabase);
    
    next();
  } catch (error) {
    console.error("Tenant middleware error:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to load tenant models",
      message: error.message 
    });
  }
};

module.exports = tenantMiddleware;
