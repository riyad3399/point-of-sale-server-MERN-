const express = require("express");
const router = express.Router();
const Quotation = require("../schemas/quotationSchema");

// Insert a quotation
router.post("/add", async (req, res) => {
  try {
    const [items, customer, { saleType }] = req.body;

    const newQuotation = new Quotation({
      quotationId: customer.value,
      customer,
      items,
      saleType,
    });

    const saved = await newQuotation.save();
    res
      .status(201)
      .json({ message: "Quotation created successfully", data: saved });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Failed to create quotation", error: err.message });
  }
});

// GET - All Quotations
router.get("/", async (req, res) => {
  try {
    const quotation = await Quotation.find();
    res.status(200).json(quotation);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Failed to create quotation", error: err.message });
  }
});

module.exports = router;
