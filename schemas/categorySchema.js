const mongoose = require("mongoose");

const categorySchema = mongoose.Schema(
  {
    categoryId: {
      type: Number,
      unique: true,
      required: true,
      default: function () {
        return Math.floor(Math.random() * 900000) + 100000;
      },
    },
    categoryName: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Pending"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);
