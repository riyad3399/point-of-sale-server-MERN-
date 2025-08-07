const { getTenantModels } = require("../model/tenantModels");

const tenantMiddleware = async (req, res, next) => {
  const tenantId = req.headers["x-tenant-id"]; // অথবা req.subdomain

  if (!tenantId) {
    return res.status(400).json({ error: "Tenant ID is required" });
  }

  try {
    req.tenantId = tenantId;
    req.models = await getTenantModels(tenantId); 
    next();
  } catch (error) {
    console.error("Tenant middleware error:", error);
    res.status(500).json({ error: "Failed to load tenant models" });
  }
};

module.exports = tenantMiddleware;
