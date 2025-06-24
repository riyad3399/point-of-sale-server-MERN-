const express = require("express");
const router = express.Router();
const Invoice = require("../schemas/invoiceSchema");
const Product = require("../schemas/productSchema");
const deductStockFIFO = require("../utils/deductStockFIFO");


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

    let due = 0;
    let change = 0;
    if (totals.paid < totals.payable) {
      due = totals.payable - totals.paid;
    } else if (totals.paid > totals.payable) {
      change = totals.paid - totals.payable;
    }

    const updatedItems = [];

    for (const item of items) {
      const { productId, quantity } = item;

      if (!productId || !quantity) {
        console.error("Missing productId or quantity in item:", item);
        continue;
      }

      // FIFO deduct with batch details
      const result = await deductStockFIFO(productId, quantity);

      if (!result.success) {
        return res.status(400).json({
          message: `Insufficient stock for product ${productId}`,
        });
      }

      // Product quantity decrement
      await Product.findByIdAndUpdate(productId, {
        $inc: { quantity: -quantity },
      });

      updatedItems.push({
        ...item,
        batches: result.deductedBatches, // <-- add batch details here
      });
    }

    const newInvoice = new Invoice({
      transactionId,
      saleSystem,
      customer,
      paymentMethod,
      items: updatedItems,
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
    res
      .status(500)
      .json({ message: "Something went wrong", error: err.message });
  }
});

// Profit 
router.get("/profit", async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return res
        .status(400)
        .json({ message: "fromDate এবং toDate অবশ্যই দিতে হবে" });
    }

    const from = new Date(fromDate);
    from.setHours(0, 0, 0, 0);

    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);

    const aggregation = await Invoice.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $unwind: "$items" },
      {
        $project: {
          transactionId: 1,
          createdAt: 1,
          itemProfit: {
            $multiply: [
              { $subtract: ["$items.price", "$items.purchasePrice"] },
              "$items.quantity",
            ],
          },
        },
      },
      {
        $group: {
          _id: "$transactionId",
          totalProfit: { $sum: "$itemProfit" },
          createdAt: { $first: "$createdAt" },
        },
      },
      {
        $sort: { totalProfit: -1 },
      },
    ]);

    const totalProfit = aggregation.reduce(
      (acc, cur) => acc + cur.totalProfit,
      0
    );
    const totalInvoices = aggregation.length;
    const topInvoice = aggregation[0] || { transactionId: "-", totalProfit: 0 };

    res.json({
      totalProfit,
      totalInvoices,
      topInvoice,
      fromDate,
      toDate,
      data: aggregation.sort((a, b) => a.createdAt - b.createdAt), // তারিখ ক্রমানুসারে সাজানো
    });
  } catch (err) {
    console.error("Profit fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /due-customers?dueDate=2025-05-28
router.get("/due-customers", async (req, res) => {
  try {
    const { dueDate } = req.query;

    const matchConditions = {
      "totals.due": { $gt: 0 },
    };

    if (dueDate && dueDate.trim() !== "") {
      const start = new Date(dueDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(dueDate);
      end.setHours(23, 59, 59, 999);

      matchConditions["dueDate"] = { $gte: start, $lte: end };
    }

    const pipeline = [
      { $match: matchConditions },
      {
        $group: {
          _id: {
            name: "$customer.name",
            phone: "$customer.phone",
          },
          totalDue: { $sum: "$totals.due" },
          totalPaid: { $sum: "$totals.paid" },
          invoiceCount: { $sum: 1 },
          invoiceIds: { $push: "$transactionId" },
        },
      },
      {
        $project: {
          _id: 0,
          name: "$_id.name",
          phone: "$_id.phone",
          totalDue: 1,
          totalPaid: 1,
          invoiceCount: 1,
          invoiceIds: 1,
        },
      },
      { $sort: { totalDue: -1 } },
    ];

    if (!dueDate || dueDate.trim() === "") {
      pipeline.push({ $limit: 10 });
    }

    const customers = await Invoice.aggregate(pipeline);

    res.status(200).json(customers);
  } catch (error) {
    console.error("Error fetching due customers:", error);
    res.status(500).json({ message: "Failed to fetch due customers" });
  }
});

// GET - Recent Transactions
router.get("/recent-transactions", async (req, res) => {
  try {
    const recentTransactions = await Invoice.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .select("transactionId createdAt paymentMethod totals.total totals.due");

    res.json(recentTransactions);
  } catch (error) {
    console.error("Error fetching recent transactions:", error);
    res.status(500).json({ message: "Failed to fetch recent transactions" });
  }
});

// GET - All invoice
router.get("/", async (req, res) => {
  try {
    const invoice = await Invoice.find().sort({_id: -1})
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
              purchasePrice: "$items.purchasePrice",
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

//  GET - Dashboard today's sales
router.get("/today-sales", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Today 00:00

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1); // Tomorrow 00:00

    const result = await Invoice.aggregate([
      {
        $match: {
          createdAt: { $gte: today, $lt: tomorrow },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totals.payable" },
          totalDue: { $sum: "$totals.due" },
          wholeSale: {
            $sum: {
              $cond: [
                { $eq: ["$saleSystem", "wholeSale"] },
                "$totals.payable",
                0,
              ],
            },
          },
          retailSale: {
            $sum: {
              $cond: [
                { $eq: ["$saleSystem", "retailSale"] },
                "$totals.payable",
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalSales: 1,
          totalDue: 1,
          wholeSale: 1,
          retailSale: 1,
        },
      },
    ]);

    res.json(
      result[0] || {
        totalSales: 0,
        totalDue: 0,
        wholeSale: 0,
        retailSale: 0,
      }
    );
  } catch (err) {
    console.error("Today's sales error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET - Dashboard total sales
router.get("/total-sales", async (req, res) => {
  try {
    const result = await Invoice.aggregate([
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totals.payable" },
          totalDue: { $sum: "$totals.due" },
          wholeSale: {
            $sum: {
              $cond: [
                { $eq: ["$saleSystem", "wholeSale"] },
                "$totals.payable",
                0,
              ],
            },
          },
          retailSale: {
            $sum: {
              $cond: [
                { $eq: ["$saleSystem", "retailSale"] },
                "$totals.payable",
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalSales: 1,
          totalDue: 1,
          wholeSale: 1,
          retailSale: 1,
        },
      },
    ]);

    res.json(
      result[0] || {
        totalSales: 0,
        totalDue: 0,
        wholeSale: 0,
        retailSale: 0,
      }
    );
  } catch (err) {
    console.error("Total sales error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET - Sales over view chart
router.get("/sales-7-days", async (req, res) => {
  try {
    const today = new Date();
    const result = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const start = new Date(d.setHours(0, 0, 0, 0));
      const end = new Date(d.setHours(23, 59, 59, 999));

      const invoices = await Invoice.find({
        createdAt: { $gte: start, $lte: end },
      });

      let totalSale = 0;
      let totalDue = 0;
      let totalWholesale = 0;
      let totalRetail = 0;

      for (const invoice of invoices) {
        const total = invoice?.totals?.total || 0;
        const due = invoice?.totals?.due || 0;

        totalSale += total;
        totalDue += due;

        if (invoice.saleSystem === "wholesale") {
          totalWholesale += total;
        } else if (invoice.saleSystem === "retail") {
          totalRetail += total;
        }
      }

      result.push({
        date: start.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        totalSale,
        totalDue,
        totalWholesale,
        totalRetail,
      });
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load sales overview" });
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
