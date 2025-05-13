const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    transactionId: {
      type: Number,
      required: true,
      unique: true,
      default: function () {
        return Math.floor(1000 + Math.random() * 9000); // 4-digit number
      },
    },
    saleSystem: {
      type: String,
      enum: ["wholeSale", "retailSale"],
      required: true,
      default: "retailSale",
    },
    customer: {
      name: String,
      phone: String,
    },
    paymentMethod: String,
    items: [
      {
        name: String,
        quantity: Number,
        price: Number,
        total: Number,
      },
    ],
    totals: {
      total: Number,
      discount: Number,
      payable: Number,
      paid: Number,
      due: Number,
      change: Number,
    },
    dueDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invoice", invoiceSchema);
