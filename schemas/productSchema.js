const mongoose = require("mongoose");

const productSchema = mongoose.Schema(
  {
    productName: {
      type: String,
      required: true,
    },
    productCode: {
      type: Number,
      unique: true,
      required: true, // Ensure productCode is always provided
      default: function () {
        return Math.floor(Math.random() * 900000) + 100000; // Default to a random number
      },
    },
    category: {
      type: String,
      required: true,
    },
    brand: String,
    purchasePrice: {
      type: Number,
      required: true,
      trim: true,
    },
    retailPrice: {
      type: Number,
      required: true,
      trim: true,
    },
    wholesalePrice: {
      type: Number,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      trim: true,
    },
    alertQuantity: Number,
    unit: {
      type: String,
      enum: ["pcs", "kg", "ltr"],
    },
    tax: Number,
    taxType: {
      type: String,
      enum: ["inclusive", "exclusive"],
    },
    Description: {
      type: String,
    },
    photo: {
      type: Buffer, // image binary
    },
    size: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      trim: true,
      lowercase: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
