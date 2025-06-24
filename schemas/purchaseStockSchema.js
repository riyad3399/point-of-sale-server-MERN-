const mongoose = require("mongoose");

const purchaseStockSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    purchasePrice: {
      type: Number,
      required: true,
      min: [0, "Purchase price must be positive"],
    },
    retailPrice: {
      type: Number,
      required: true,
      min: [0, "Retail price must be positive"],
    },
    wholesalePrice: {
      type: Number,
      required: true,
      min: [0, "Wholesale price must be positive"],
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    quantity: {
      type: Number,
      required: true,
    },
    remainingQuantity: {
      type: Number,
      required: true,
    },
    purchaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Purchase",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("PurchaseStock", purchaseStockSchema);
