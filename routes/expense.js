const express = require("express");
const router = express.Router();
const Expense = require("../schemas/expenseSchema");

// POST - Add new expense
router.post("/", async (req, res) => {
  try {
      const { date, method, items } = req.body;

    if (!date || !method || !items || !items.length) {
      return res.status(400).json({ error: "Invalid expense data" });
    }

    const newExpense = new Expense({
      date,
      method,
      items,
    });

    await newExpense.save();

    res.status(201).json({
      message: "Expense added successfully",
      expense: newExpense,
    });
  } catch (err) {
    console.error("Error creating expense:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// GET - all expense
router.get("/", async (req, res) => {
  try {
    const { date, method } = req.query;

    const filter = {};

    if (date) {
      filter.date = date;
    }

    if (method) {
      filter.method = method.toUpperCase(); 
    }

    const expenses = await Expense.find(filter).sort({ date: -1 });

    res.status(200).json(expenses);
  } catch (err) {
    console.error("Failed to fetch expenses:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
