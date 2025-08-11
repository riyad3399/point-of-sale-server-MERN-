const jwt = require("jsonwebtoken");

const user = {
  _id: "64dc9c6f9b6e1c2e5a4f1234",
  userName: "admin",
  tenantId: "master",
};

const secretKey = "thisisarandomstring";

const token = jwt.sign(
  { id: user._id, userName: user.userName, tenantId: user.tenantId },
  secretKey,
  { expiresIn: "7d" }
);

console.log("Generated Token:", token);
