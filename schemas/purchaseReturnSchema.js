const mongoose = require("mongoose");

const PurchaseReturnItemSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true,
  },
  productName: { type: String, required: false },
  qty: { type: Number, required: true, min: 0 },
  price: { type: Number, required: true, default: 0 },
  discount: { type: Number, required: false, default: 0 },
  lineTotal: { type: Number, required: true, default: 0 },
});

const purchaseReturnSchema = new mongoose.Schema(
  {
    purchaseId: {
      type: String,
      required: true,
    },
    invoiceNumber: { type: Number, required: false }, // string or number
    supplierId: {
      type: String,
      required: false,
    },
    supplierName: { type: String, required: false },
    items: { type: [PurchaseReturnItemSchema], default: [] },
    totalReturnAmount: { type: Number, required: true, default: 0 },
    reason: { type: String, default: "" },
    returnDate: { type: Date, required: true, default: Date.now },
    createdBy: {
      type: String,
      required: false,
    }, 
    meta: { type: Object, required: false },
  },
  { timestamps: true }
);

module.exports = purchaseReturnSchema;
