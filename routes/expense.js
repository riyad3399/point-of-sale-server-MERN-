const express = require("express");
const router = express.Router();

// POST - Add new expense
router.post("/", async (req, res) => {
  try {
    const { Expense } = req.models;
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
    const { Expense } = req.models;
    const { date, method } = req.query;

    const filter = {};

    if (date) {
      filter.date = date;
    }

    if (method) {
      filter.method = method.toUpperCase();
    }

    const expenses = await Expense.find(filter).sort({ _id: -1 });

    res.status(200).json(expenses);
  } catch (err) {
    console.error("Failed to fetch expenses:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT - A Expense
router.put("/:id", async (req, res) => {
  try {
    const { Expense } = req.models;
    const { date, method, items } = req.body;
    const id = req.params.id;

    if (!date || !Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ message: "Date and at least one item are required." });
    }

    // Calculate totalAmount
    const totalAmount = items.reduce((sum, item) => {
      const quantity = item.quantity || 1;
      const unitPrice = item.unitPrice || 0;
      return sum + quantity * unitPrice;
    }, 0);

    const updatedExpense = await Expense.findByIdAndUpdate(
      id,
      {
        date,
        method,
        items,
        totalAmount,
      },
      { new: true, runValidators: true }
    );

    if (!updatedExpense) {
      return res.status(404).json({ message: "Expense not found." });
    }

    res.json(updatedExpense);
  } catch (error) {
    console.error("Error updating expense:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE - A Expense
router.delete("/:id", async (req, res) => {
  try {
    const { Expense } = req.models;
    const id = req.params.id;
    const deleted = await Expense.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Expense not found" });
    }
    res.json({ message: "Expense deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting product", error });
  }
});

// GET - A Expense
router.get("/:id", async (req, res) => {
  try {
    const { Expense } = req.models;
    const id = req.params.id;
    const expense = await Expense.findById(id);

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }
    res.status(200).json(expense);
  } catch (error) {
    res.status(500).json({
      message: "Something went wrong",
      error: error.message,
    });
  }
});

module.exports = router;
