const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  permissions: [
    {
      type: String, // or ObjectId with ref to Permission model
      required: true,
    },
  ],
});

module.exports = roleSchema;
