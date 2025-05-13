const express = require("express");
const router = express.Router();
const Invoice = require("../schemas/invoiceSchema");

// Create a  invoice
router.post("/", async (req, res) => {
  try {
    const {
      transactionId,
      saleSystem,
      customer,
      paymentMethod,
      items,
      totals,
      dueDate,
    } = req.body;

    // Calculate due and change
    let due = 0;
    let change = 0;
    if (totals.paid < totals.payable) {
      due = totals.payable - totals.paid;
    } else if (totals.paid > totals.payable) {
      change = totals.paid - totals.payable;
    }

    const newInvoice = new Invoice({
      transactionId,
      saleSystem, 
      customer,
      paymentMethod,
      items,
      totals: {
        ...totals,
        due,
        change,
      },
      dueDate: due > 0 ? dueDate : null,
    });


    const savedInvoice = await newInvoice.save();
    res.status(201).json(savedInvoice);
  } catch (err) {
    console.error("Invoice creation error:", err);
    res.status(500).json({ message: "Something went wrong", error: err });
  }
});

// GET - All invoice
router.get("/", async (req, res) => {
  try {
    const invoice = await Invoice.find()
    res.status(200).json(invoice)
    
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch invoice" });
  }
})

// GET all wholesale invoices
router.get("/wholesale", async (req, res) => {
  try {
    const invoices = await Invoice.find({ saleSystem: "wholeSale" });
    res.json(invoices);
  } catch (err) {
    console.error("Error fetching wholesale invoices:", err);
    res.status(500).json({ message: "Failed to fetch invoice" });
  }
});
// GET all retailSale invoices
router.get("/retailsale", async (req, res) => {
  try {
    const invoices = await Invoice.find({ saleSystem: "retailSale" });
    res.json(invoices);
  } catch (err) {
    console.error("Error fetching retailSale invoices:", err);
    res.status(500).json({ message: "Failed to fetch invoice" });
  }
});


module.exports = router;
