const mongoose = require("mongoose");

const productSchema = mongoose.Schema({
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
    required:true
  },
  brand: String,
  purchasePrice: {
    type: Number,
    required: true,
  },
  retailPrice: {
    type: Number,
    required: true,
  },
  wholesalePrice: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
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
});

module.exports = mongoose.model("Product", productSchema);
