const express = require("express");
const router = express.Router();
const Purchase = require("../schemas/purchaseSchema");
const Product = require("../schemas/productSchema");

//POST - A new purchase 
router.post("/add", async (req, res) => {
  try {
    const { supplier, items, total, paid, paymentMethod } = req.body;

    // Validate input
    if (!supplier || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Invalid purchase data" });
    }

    const purchaseItems = [];

    // Loop through each item
    for (const item of items) {
      const { productId, quantity, purchasePrice } = item;

      const product = await Product.findById(productId);

      if (!product) {
        return res
          .status(404)
          .json({ message: `Product not found: ${productId}` });
      }

      // Update product quantity and purchase price
      product.quantity += quantity;
      product.currentPurchasePrice = purchasePrice;
      await product.save();

      purchaseItems.push({
        product: productId,
        quantity,
        purchasePrice,
      });
    }

    // Create new purchase record
    const newPurchase = new Purchase({
      supplier,
      items: purchaseItems,
      total,
      paid,
      due: total - paid,
      paymentMethod,
    });

    await newPurchase.save();

    res.status(201).json({
      message: "Purchase successful",
      purchase: newPurchase,
    });
  } catch (error) {
    console.error("Purchase error:", error);
    res.status(500).json({
      message: "Something went wrong",
      error: error.message,
    });
  }
});

// GET - all purchases
router.get("/", async (req, res) => {
    try {
        const purchases = await Purchase.find().sort({ _id: -1 });
        res.status(200).json({
            message: "Fetch All Purchases Successfull!",
            data: purchases
        })
    } catch (error) {
        console.error("Purchase error:", error);
        res.status(500).json({
          message: "Something went wrong",
          error: error.message,
        });
    }
})

module.exports = router;
