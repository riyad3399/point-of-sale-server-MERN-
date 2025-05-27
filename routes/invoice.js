const express = require("express");
const router = express.Router();
const Invoice = require("../schemas/invoiceSchema");
const Product = require("../schemas/productSchema");

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

    for (const item of items) {
      const { productId, quantity } = item;

      if (!productId || !quantity) {
        console.error("Missing productId or quantity in item:", item);
        continue;
      }

      await Product.findByIdAndUpdate(productId, {
        $inc: { quantity: -quantity },
      });
    }

    // Step 3: Invoice তৈরি করো
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
    const invoice = await Invoice.find();
    res.status(200).json(invoice);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch invoice" });
  }
});

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


// GET - Report Statement

router.get("/report", async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return res
        .status(400)
        .json({ error: "Both fromDate and toDate are required." });
    }

    const from = new Date(`${fromDate}T00:00:00.000Z`);
    const to = new Date(`${toDate}T23:59:59.999Z`);

    const result = await Invoice.aggregate([
      {
        $match: {
          createdAt: { $gte: from, $lte: to },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: {
            productId: "$items.productId",
            name: "$items.name",
          },
          totalQuantity: { $sum: "$items.quantity" },
          totalAmount: { $sum: "$items.total" },
          customers: {
            $push: {
              name: "$customer.name",
              phone: "$customer.phone",
              quantity: "$items.quantity",
              amount: "$items.total",
              transactionId: "$transactionId",
              createdAt: "$createdAt",
              paymentMethod: "$paymentMethod",
              saleSystem: "$saleSystem",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          productId: "$_id.productId",
          name: "$_id.name",
          totalQuantity: 1,
          totalAmount: 1,
          customers: 1,
        },
      },
    ]);

    res.json(result);
  } catch (err) {
    console.error("Item-wise report error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// GET - A invoice
router.get("/:id", async (req, res) => {
  console.log("hello world");
  try {
    const id = req.params.id;
    const singleInvoice = await Invoice.findById(id);

    if (!singleInvoice) {
      return res.status(404).json({ message: "Invoice not found!" });
    }
    res.status(200).json(singleInvoice);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch invoice" });
  }
});

// GET - customer payment details
router.get("/:id/payment-details", async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findOne({ transactionId: Number(id) }).select(
      "paymentDetails customer"
    );

    if (!invoice) {
      return res.status(404).json({ message: "Payment Details not found" });
    }

    res.status(200).json({
      paymentDetails: invoice.paymentDetails,
      customer: invoice.customer,
    });
  } catch (err) {
    console.error("Error fetching payment details:", err);
    res.status(500).json({ message: "Failed to fetch payment details" });
  }
});





// UPDATE - A invoice
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { paid, discount = 0, nextDueAmount = 0, nextDueDate } = req.body;

    // Validate input
    if (typeof paid !== "number" || paid < 0) {
      return res.status(400).json({ message: "Invalid paid amount" });
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // Update totals
    invoice.totals.paid += paid;
    invoice.totals.discount += discount;
    invoice.totals.due = nextDueAmount;

    // Push paymentDetails entry
    invoice.paymentDetails.push({
      currentPaymentDate: new Date(),
      discount,
      paid,
      nextDueAmount,
      nextDueDate,
    });

    await invoice.save();

    res.status(200).json({
      message: "Payment updated successfully",
      invoice,
    });
  } catch (err) {
    console.error("Payment update error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE - A invoice
router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const deletedInvoice = await Invoice.findByIdAndDelete(id);

    if (!deletedInvoice) {
      return res.status(404).json({ message: "Invoice not found!" });
    }

    res.status(200).json({
      message: "Invoice deleted successfully!",
      invoice: deletedInvoice,
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong!" });
  }
});

module.exports = router;
