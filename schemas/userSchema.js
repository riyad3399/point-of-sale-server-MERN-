const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
    unique: true,
  },

  password: {
    type: String,
    required: true,
  },

  roles: [
    {
      type: String, // You can also use ObjectId with ref: "Role"
    },
  ],

  customPermissions: [
    {
      type: String,
    },
  ],

  createdOn: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model("User", userSchema);
module.exports = User;
