const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: true,
      trim: true,
    },

    barcode: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      maxlength: 128,
      index: true,
      validate: {
        validator: function (v) {
          return typeof v === "string" && v.trim().length > 0;
        },
        message: "Invalid barcode",
      },
    },
    barcodeType: {
      type: String,
      enum: ["upc-a", "ean-13", "ean-8", "code-39", "code-128"],
      default: "code-128",
      trim: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    brand: { type: String, default: "no brand", trim: true },

    purchasePrice: { type: Number, required: true, min: 0 },
    retailPrice: { type: Number, required: true, min: 0 },
    wholesalePrice: { type: Number, required: true, min: 0 },

    quantity: { type: Number, required: true, min: 0, default: 0 },
    alertQuantity: { type: Number, min: 0, default: 0 },

    unit: {
      type: String,
      enum: ["pcs", "kg", "ltr"],
      default: "pcs",
    },

    tax: { type: Number, default: 0 },

    taxType: {
      type: String,
      enum: ["inclusive", "exclusive"],
      default: "inclusive",
    },

    description: { type: String, default: "no description", trim: true },

    photo: { type: String, default: "/uploads/default.png" },

    size: { type: String, trim: true, default: "no size" },
    color: { type: String, trim: true, lowercase: true, default: "no color" },
  },
  { timestamps: true }
);

// Ensure barcode is always saved as string (coerce if needed)
productSchema.pre("save", function (next) {
  if (this.barcode !== undefined && this.barcode !== null) {
    this.barcode = String(this.barcode).trim();
  }
  next();
});

module.exports = productSchema;
