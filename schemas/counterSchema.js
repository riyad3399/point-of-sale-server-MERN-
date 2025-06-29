// models/Counter.js
const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // যেমন: "purchase_invoice"
  value: { type: Number, default: 1 }, // শুরুতে 1
});

module.exports = mongoose.model("Counter", counterSchema);
