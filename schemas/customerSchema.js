const mongoose = require("mongoose");

const customerSchema = mongoose.Schema(
  {
    customerId: {
      type: Number,
      unique: true,
      default: function () {
        return Math.floor(Math.random() * 900000) + 100000;
      },
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", customerSchema);
