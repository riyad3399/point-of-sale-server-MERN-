const mongoose = require("mongoose");

function generateSupplierId() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const supplierSchema = new mongoose.Schema(
  {
    supplierId: {
      type: Number,
      unique: true,
      required: true,
      default: generateSupplierId,
    },
    name: {
      type: String,
      required: [true, "Supplier name is required"],
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          return /^01[3-9]\d{8}$/.test(v);
        },
        message: "Invalid Bangladeshi phone number",
      },
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    address: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);


module.exports = mongoose.model("Supplier", supplierSchema);
