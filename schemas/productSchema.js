const mongoose = require("mongoose");

const productSchema = mongoose.Schema(
  {
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    productCode: {
      type: Number,
      unique: true,
      required: true,
      default: function () {
        return Math.floor(Math.random() * 900000) + 100000;
      },
    },
    category: {
      type: String,
      required: true,
    },
    brand: { type: String, default: "no brand" },

    purchasePrice: { type: Number, required: true, min: 0 },
    retailPrice: { type: Number, required: true, min: 0 },
    wholesalePrice: { type: Number, required: true, min: 0 },

    quantity: { type: Number, required: true, min: 0, default: 0 },
    alertQuantity: { type: Number, min: 0, default: 0 },

    unit: {
      type: String,
      enum: ["pcs", "kg", "ltr"], // ✅ এখন default enum-এর ভেতরে
      default: "pcs",
    },

    tax: { type: Number, default: 0 },

    taxType: {
      type: String,
      enum: ["inclusive", "exclusive"],
      default: "inclusive",
    },

    description: { type: String, default: "no description" },

    photo: { type: Buffer }, // image binary

    size: { type: String, trim: true, default: "no size" },
    color: { type: String, trim: true, lowercase: true, default: "no color" },
  },
  { timestamps: true }
);

module.exports = productSchema;
