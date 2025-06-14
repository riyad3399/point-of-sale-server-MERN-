const mongoose = require("mongoose");

const ItemSchema = new mongoose.Schema({
  category: {
    type: String,
    required: false,
  },
  remarks: {
    type: String,
    default: "",
  },
  unitPrice: {
    type: Number,
    required: true,
    default: 0,
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
  },
});

const ExpenseSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
    },
    method: {
      type: String,
      enum: ["CASH", "BKASH", "BANK"],
      default: "CASH",
    },
    items: {
      type: [ItemSchema],
      validate: [(val) => val.length > 0, "At least one item is required."],
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-calculate totalAmount before saving
ExpenseSchema.pre("save", function (next) {
  this.totalAmount = this.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  next();
});

module.exports =
  mongoose.models.Expense || mongoose.model("Expense", ExpenseSchema);
