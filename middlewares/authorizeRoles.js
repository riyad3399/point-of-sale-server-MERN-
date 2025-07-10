function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    const userRole = req.user?.role; // string type
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You don't have the required role.",
      });
    }
    next();
  };
}
module.exports = authorizeRoles;
