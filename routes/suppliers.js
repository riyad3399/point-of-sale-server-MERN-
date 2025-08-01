// routes/supplierRoutes.js
const express = require("express");
const router = express.Router();
const Supplier = require("../schemas/supplierSchem");

// ✅ Add New Supplier Route
router.post("/add", async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;

    const newSupplier = new Supplier({
      name,
      phone,
      email,
      address,
    });

    await newSupplier.save();

    res.status(201).json({
      message: "Supplier created successfully!",
      supplier: newSupplier,
    });
  } catch (err) {

    // Handle duplicate email or supplierId errors
    if (err.code === 11000) {
      const duplicatedField = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        message: `${duplicatedField} already exists.`,
      });
    }

    res.status(500).json({
      message: "Server error while adding supplier",
      error: err.message,
    });
  }
});

// GET - all Suppliers
router.get("/", async (req, res) => {
    try {
        const suppliers = await Supplier.find().sort({ _id: -1 });
        res.status(200).json({
          message: "Fetch All Supplier Successfull!",
          data: suppliers,
        });
        
    } catch (error) {
        res.status(500).json({
          message: "Something went wrong",
          error: error.message,
        });
    }
})

// GET - A supplier
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await Supplier.findOne({ _id: id });

    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    res.status(200).json(supplier);
  } catch (error) {
    console.error("Error fetching supplier:", error);
    res.status(500).json({ message: "Server error" });
  }
})

module.exports = router;
