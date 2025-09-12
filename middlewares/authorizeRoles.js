// middlewares/authorizeRoles.js
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    try {
      const userRole = req.user?.role; // user JWT থেকে এসেছে

      if (!userRole) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: No role found in user context.",
        });
      }

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You don't have the required role.",
        });
      }

      next();
    } catch (err) {
      console.error("Authorization error:", err);
      res.status(500).json({
        success: false,
        message: "Internal Server Error in authorization",
      });
    }
  };
}

module.exports = authorizeRoles;
