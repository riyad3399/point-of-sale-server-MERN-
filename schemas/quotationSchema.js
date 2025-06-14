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
    value: { type: Number },
  },
  { _id: false }
);

const quotationSchema = new mongoose.Schema(
  {
    quotationId: { type: Number, unique: true }, 
    customer: customerSchema,
    items: [itemSchema],
    saleType: {
      type: String,
      enum: ["retailSale", "wholeSale"],
      required: true,
    },
    shippingCost: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);


quotationSchema.pre("save", async function (next) {
  if (this.quotationId) return next(); 
  const lastQuotation = await this.constructor.findOne().sort({ quotationId: -1 });
  this.quotationId = lastQuotation ? lastQuotation.quotationId + 1 : 100001;

  next();
});

module.exports = mongoose.model("Quotation", quotationSchema);
