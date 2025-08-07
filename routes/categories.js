// const express = require("express");
// const router = express.Router();
// const Category = require("../schemas/categorySchema");

// // POST - A category
// router.post("/", async (req, res) => {
//   try {
//     const newCategory = new Category(req.body);
//     const saveCategory = await newCategory.save();
//     res.status(200).json(saveCategory);
//   } catch (err) {
//     res.status(500).json("There was server error", err);
//   }
// });

// // GET - all Categories
// router.get("/", async (req, res) => {
//   try {
//     const categories = await Category.find().sort({ _id: -1 });
//     res.status(200).json(categories);
//   } catch (err) {
//     res.status(500).json("There was server error", err);
//   }
// });

// // DELETE - A Category
// router.delete("/:id", async (req, res) => {
//   try {
//     const id = req.params.id;
//     const result = await Category.deleteOne({ _id: id });
//     res.status(200).json(result);
//   } catch (err) {
//     console.log(err);
//     res.status(500).json("There was server error", err);
//   }
// });

// // PATCH - A category
// router.patch("/:id", async (req, res) => {
//   const { id } = req.params;
//   const updateData = req.body;

//   try {
//     const updatedCategory = await Category.findByIdAndUpdate(id, updateData, {
//       new: true,
//       runValidators: true,
//     });

//     if (!updatedCategory) {
//       return res.status(404).json({ message: "Category not found" });
//     }

//     res.json(updatedCategory);
//   } catch (error) {
//     console.error("Error updating category:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// })

// module.exports = router;

const express = require("express");
const router = express.Router();

// Tenant middleware is applied globally in server.js

// POST - A category
router.post("/", async (req, res) => {
  try {
    const { Category } = req.models;
    const tenantId = req.tenantId;
    const categories = await Category.find({});
    res.status(200).json({ categories, tenantId });
  } catch (err) {
    console.error("Error saving category:", err);
    res
      .status(500)
      .json({ message: "There was a server error", error: err.message });
  }
});

// GET - all Categories
router.get("/", async (req, res) => {
  try {
    const { Category } = req.models;

    const categories = await Category.find().sort({ _id: -1 });
    res.status(200).json(categories);
  } catch (err) {
    console.error("Error fetching categories:", err);
    res
      .status(500)
      .json({ message: "There was a server error", error: err.message });
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
    console.error("Error deleting category:", err);
    res
      .status(500)
      .json({ message: "There was a server error", error: err.message });
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
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
