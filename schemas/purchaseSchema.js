const mongoose = require("mongoose");




const purchaseItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  purchasePrice: {
    type: Number,
    required: true,
    min: 0,
  },
  retailPrice: {
    type: Number,
    required: false,
    min: 0,
  },
  wholesalePrice: {
    type: Number,
    required: false,
    min: 0,
  },
});

const supplierSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const purchaseSchema = new mongoose.Schema(
  {
    supplier: supplierSchema,
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },

    invoiceNumber: { type: Number, unique: true },

    items: [purchaseItemSchema],

    total: { type: Number, required: true, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    discount: { type: Number, default: 0 },
    transportCost: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    paid: { type: Number, required: false, min: 0 },
    due: { type: Number, required: true, min: 0 },

    paymentMethod: {
      type: String,
      enum: ["Cash", "Bank", "bKash", "Nagad", "Other"],
      required: true,
    },
    payments: [
      {
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
        method: {
          type: String,
          enum: ["Cash", "Bank", "bKash", "Nagad", "Other"],
          required: true,
        },
        date: {
          type: Date,
          default: Date.now,
        },
        note: {
          type: String,
          default: "",
        },
      },
    ],
    status: {
      type: String,
      enum: ["Order", "Pending", "Received"],
      default: "Received",
    },
    receivedDate: Date,

    //  Dates
    purchaseDate: { type: Date, default: Date.now },
    dueDate: { type: Date },
  },
  { timestamps: true }
);

// 🔁 Auto-increment invoiceNumber
purchaseSchema.pre("save", async function (next) {
  if (!this.isNew || this.invoiceNumber) return next();

  try {
    // use the same connection's Counter model
    const Counter = this.db.model("Counter"); // this.db points to the current connection
    const counter = await Counter.findOneAndUpdate(
      { name: "purchaseInvoice" },
      { $inc: { value: 1 } },
      { new: true, upsert: true }
    );

    this.invoiceNumber = counter.value;
    next();
  } catch (err) {
    next(err);
  }
});


module.exports = purchaseSchema;
