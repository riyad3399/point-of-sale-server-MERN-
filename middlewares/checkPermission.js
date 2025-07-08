const Role = require("../schemas/roleSchema");

function checkPermission(permissionName) {
  return async (req, res, next) => {
    try {
      const user = req.user;
      const userRoles = user.roles || [];
      const customPermissions = user.customPermissions || [];

      // 🛡️ Step 0: যদি developer হয় → সব access allow
      if (userRoles.includes("developer")) {
        return next();
      }

      // ✅ Step 1: Check custom permission
      if (customPermissions.includes(permissionName)) {
        return next();
      }

      // ✅ Step 2: Check role-based permissions from DB
      const roles = await Role.find({ name: { $in: userRoles } });
      const rolePermissions = roles.flatMap((role) => role.permissions);

      if (rolePermissions.includes(permissionName)) {
        return next();
      }

      // ❌ Step 3: Forbidden
      return res.status(403).json({
        success: false,
        message: "Forbidden: You don't have the required permission.",
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  };
}

module.exports = checkPermission;
