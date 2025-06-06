const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: { type: Number, required: true },
});

const customerSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true },
    phone: { type: String, required: true },
    label: { type: String },
    value: { type: Number }, // this acts like quotationId or customerId
  },
  { _id: false }
);

const quotationSchema = new mongoose.Schema(
  {
    quotationId: { type: Number, required: true, unique: true }, // from customer.value
    customer: customerSchema,
    items: [itemSchema],
    saleType: {
      type: String,
      enum: ["retailSale", "wholeSale"],
      required: true,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quotation", quotationSchema);
