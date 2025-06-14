const express = require("express");
const router = express.Router();
const Quotation = require("../schemas/quotationSchema");

// Insert a quotation
router.post("/add", async (req, res) => {
  try {
    const { items, customer, saleType, shippingCost } = req.body;

    // Customer আছে কিনা চেক করবো
    if (!customer || !customer.customerName || !customer.phone) {
      return res
        .status(400)
        .json({ message: "Select a Customer!" });
    }

    const newQuotation = new Quotation({
      quotationId: customer?.value, // middleware থেকে auto generate হবে যদি না থাকে
      customer,
      items,
      saleType,
      shippingCost,
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

// DELETE - a Quotation 
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await Quotation.findByIdAndDelete(id);

    if (!result) {
      return res.status(404).json({
        message: "Quotation not found!",
      });
    }

    res.status(200).json({
      message: "Delete Quotation Successful!",
      data: result,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to delete Quotation",
      error: err.message,
    });
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

// PUT: Update a quotation by quotationId
router.put("/:quotationId", async (req, res) => {
  const { quotationId } = req.params;
  const updatedData = req.body;

  try {
    const updatedQuotation = await Quotation.findOneAndUpdate(
      { quotationId: Number(quotationId) }, // find by quotationId field
      updatedData,
      { new: true } // return the updated document
    );

    if (!updatedQuotation) {
      return res.status(404).json({ message: "Quotation not found." });
    }

    res.status(200).json(updatedQuotation);
  } catch (error) {
    console.error("Error updating quotation:", error);
    res.status(500).json({ message: "Server error while updating quotation." });
  }
});

module.exports = router;
