const jwt = require("jsonwebtoken");
const { getGlobalModels } = require("../db/globalConnection");

const globalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ 
        success: false,
        message: "Unauthorized: No token provided" 
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    
    const { GlobalUser } = await getGlobalModels();
    
    const user = await GlobalUser.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: "User not found" 
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ 
        success: false,
        message: "Account is deactivated" 
      });
    }

    if (user.isLocked && user.isLocked()) {
      return res.status(403).json({ 
        success: false,
        message: "Account is locked. Please try again later." 
      });
    }

    req.globalUser = user;
    req.tenantId = user.tenantId;
    req.tenantDatabase = user.tenantDatabase;

    await GlobalUser.findByIdAndUpdate(user._id, { 
      lastLogin: new Date() 
    });

    next();
  } catch (err) {
    console.error("Global auth middleware error:", err);
    
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ 
        success: false,
        message: "Invalid token" 
      });
    }
    
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ 
        success: false,
        message: "Token expired" 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: "Authentication error" 
    });
  }
};

module.exports = globalAuthMiddleware;