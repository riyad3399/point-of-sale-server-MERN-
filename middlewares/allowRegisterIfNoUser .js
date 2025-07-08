const passport = require("passport");
const User = require("../schemas/userSchema");

const allowRegisterIfNoUser = async (req, res, next) => {
  try {
    const userCount = await User.countDocuments();

    if (userCount === 0) {
      // 🔓 No users yet — allow open registration
      return next();
    }

    // 🔐 Users exist — authenticate first
    passport.authenticate("jwt", { session: false }, (err, user) => {
      if (err || !user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!["admin", "developer"].some((r) => user.roles?.includes(r))) {
        return res
          .status(403)
          .json({ message: "Forbidden: Insufficient role" });
      }

      // ✅ Authenticated and has permission
      req.user = user;
      next();
    })(req, res, next);
  } catch (error) {
    console.error("allowRegisterIfNoUser error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = allowRegisterIfNoUser;
