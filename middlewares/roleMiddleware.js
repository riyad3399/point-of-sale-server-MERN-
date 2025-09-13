export const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      console.log("No user in request");
      return res.status(401).json({ message: "Unauthorized: No user info" });
    }

    console.log("User role:", user.role); // 🔹 এখানে role দেখাও
    console.log("Allowed roles:", allowedRoles); // 🔹 allowedRoles দেখাও

    if (!allowedRoles.includes(user.role)) {
      console.log("Access denied by roleMiddleware");
      return res.status(403).json({ message: "Forbidden: Access denied" });
    }

    next();
  };
};
