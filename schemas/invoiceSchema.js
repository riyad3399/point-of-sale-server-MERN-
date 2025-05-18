const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    transactionId: {
      type: Number,
      required: true,
      unique: true,
      default: () => Math.floor(1000 + Math.random() * 9000),
    },
    saleSystem: {
      type: String,
      enum: ["wholeSale", "retailSale"],
      required: true,
      default: "retailSale",
    },
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "bkash", "nagad", "bank", "card"],
      default: "cash",
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        total: { type: Number, required: true },
      },
    ],
    totals: {
      total: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      payable: { type: Number, default: 0 },
      paid: { type: Number, default: 0 },
      due: { type: Number, default: 0 },
      change: { type: Number, default: 0 },
    },
    dueDate: Date,
    paymentDetails: [
      {
        currentPaymentDate: { type: Date, default: Date.now },
        discount: { type: Number, default: 0 },
        paid: { type: Number, required: true },
        nextDueAmount: { type: Number, default: 0 },
        nextDueDate: Date,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invoice", invoiceSchema);
