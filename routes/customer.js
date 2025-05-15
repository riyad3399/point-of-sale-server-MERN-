const express = require("express");
const router = express.Router();
const Customer = require("../schemas/customerSchema");

// POST - A customer
router.post("/", async (req, res) => {
  try {
    const { phone } = req.body;
    const existingCustomer = await Customer.findOne({ phone });
    if (existingCustomer) {
      return res.status(409).json({
        message: "Customer already exists with this phone number.",
      });
    }
    const newCustomer = new Customer(req.body);
    const savedCustomer = await newCustomer.save();
    res.status(201).json(savedCustomer);
  } catch (err) {
    console.error(err); // Log the actual error
    res.status(500).json({ message: "There was a server error" });
  }
});

// GET - All customer
router.get("/", async (req, res) => {
  try {
    const customers = await Customer.find();
    res.status(200).json(customers);
  } catch (err) {
    res.status(500).json("There was server error", err);
  }
});

// GET - single customer by phone
router.get("/:value", async (req, res) => {
  try {
    const value = req.params.value.replace(/^\$/, ""); // remove leading $
    const customer = await Customer.findOne({ phone: value });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found!" });
    }
    res.status(200).json(customer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "There was a server error" });
  }
});

// PATCH - A Customer
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const updatedCustomer = await Customer.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedCustomer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.status(200).json(updatedCustomer);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE - A customer
router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await Customer.deleteOne({ _id: id });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json("There was server error", err);
  }
});

module.exports = router;
