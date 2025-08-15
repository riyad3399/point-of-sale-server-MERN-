const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");

// POST - A category
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { Category } = req.models; 
    const newCategory = new Category(req.body);
    const savedCategory = await newCategory.save();
    res.status(201).json(savedCategory);
  } catch (err) {
    console.error("Error saving category:", err);
    res
      .status(500)
      .json({ message: "There was server error", error: err.message });
  }
});

// GET - all Categories
router.get("/", async (req, res) => {
  try {
    const { Category } = req.models;
    const categories = await Category.find().sort({ _id: -1 });
    res.status(200).json(categories);
  } catch (err) {
    res.status(500).json("There was server error", err);
  }
});

// DELETE - A Category
router.delete("/:id", async (req, res) => {
  try {
    const { Category } = req.models;
    const id = req.params.id;
    const result = await Category.deleteOne({ _id: id });
    res.status(200).json(result);
  } catch (err) {
    console.log(err);
    res.status(500).json("There was server error", err);
  }
});

// PATCH - A category
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const { Category } = req.models;
    const updatedCategory = await Category.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json(updatedCategory);
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ message: "Server error" });
  }
})

module.exports = router;

