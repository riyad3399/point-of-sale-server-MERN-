function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    const userRoles = req.user?.roles || []; // now supports multiple roles

    const hasRole = userRoles.some((role) => allowedRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You don't have the required role.",
      });
    }

    next();
  };
}

module.exports = authorizeRoles;
