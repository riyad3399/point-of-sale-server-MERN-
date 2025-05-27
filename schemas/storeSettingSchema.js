const mongoose = require("mongoose");

const StoreSettingSchema = mongoose.Schema(
  {
    storeName: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    zip: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    taxRate: {
      type: Number,
      required: false,
    },
    currency: {
      type: String,
      required: true,
    },
    logo: { type: String }, // multer দিয়ে আপলোডকৃত ফাইলের URL/পাথ
  },
  { timestamps: true }
);

module.exports = mongoose.model("Setting", StoreSettingSchema);
