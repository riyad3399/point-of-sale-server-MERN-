const User = require("../schemas/userSchema"); 

const canUpdateUser = async (req, res, next) => {
  const currentUser = req.user; // from auth middleware
  const targetUserId = req.params.id;

  if (!currentUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentRole = currentUser.role;
    const targetRole = targetUser.role;

    // 1. No one can update their own role/permission
    if (currentUser._id.toString() === targetUserId) {
      return res
        .status(403)
        .json({ message: "You can't update your own role or permissions" });
    }

    // 2. Developer can update anyone
    if (currentRole === "developer") {
      return next();
    }

    // 3. Admin can update others except developer
    if (currentRole === "admin") {
      if (targetRole === "developer") {
        return res
          .status(403)
          .json({ message: "Admins cannot update developers" });
      }
      return next();
    }

    // 4. Others can't update anyone
    return res
      .status(403)
      .json({ message: "You do not have permission to update users" });
  } catch (err) {
    console.error("Authorization error:", err);
    return res.status(500).json({ message: "Authorization check failed" });
  }
};

module.exports = canUpdateUser;