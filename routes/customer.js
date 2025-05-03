const express = require("express");
const router = express.Router();
const Customer = require("../schemas/customerSchema")


// POST - A customer
router.post("/", async (req, res) => {
  try {
    const newCustomer = new Customer(req.body);
    const saveCustomer = await newCustomer.save();
    res.status(200).json(saveCustomer);
  } catch (err) {
    res.status(500).json("There was server error", err);
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





module.exports = router