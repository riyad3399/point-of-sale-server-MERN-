const express = require("express");
const router = express.Router();
const Product = require("../schemas/productSchema");
const multer = require("multer");

// Multer setup
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// POST - Add a New Product
router.post("/", upload.single("photo"), async (req, res) => {
  try {
    const {
      productName,
      sku,
      category,
      brand,
      purchasePrice,
      retailPrice,
      wholesalePrice,
      quantity,
      alertQuantity,
      unit,
      tax,
      taxType,
      description,
    } = req.body;

    const photo = req.file ? req.file.buffer : undefined;

    const product = new Product({
      productName,
      productCode: sku,
      category,
      brand,
      purchasePrice,
      retailPrice,
      wholesalePrice,
      quantity,
      alertQuantity,
      unit,
      tax,
      taxType,
      Description: description,
      photo,
    });

    const savedProduct = await product.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE - A product
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });

    const updatedProducts = await Product.find(); // Fetch updated list
    res.status(200).json(updatedProducts);
  } catch (err) {
    res.status(500).json({ message: "Error deleting product" });
  }
});

// PATCH - update a product
router.patch("/:id", upload.single("photo"), async (req, res) => {
  try {
    const updates = { ...req.body };

    if (req.file) {
      
      updates.photo = req.file.buffer;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product Not Found" });
    }

    res.status(200).json(updatedProduct);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update product" });
  }
});



// GET - All products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find(); // photo exclude
    res.status(200).json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

// GET - single product
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const product = await Product.findOne({ _id: id });
    res.status(200).json(product);
  } catch (err) {
    console.log(err);
  }
});

router.get("/image/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product || !product.photo) {
      return res.status(404).json({ message: "Image not found" });
    }

    // Set the correct image MIME type (assuming JPEG image here)
    res.set("Content-Type", "image/jpeg");
    res.send(product.photo); // Send the image as a binary stream
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
