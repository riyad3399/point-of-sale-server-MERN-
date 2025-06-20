const express = require("express");
const router = express.Router();
const Purchase = require("../schemas/purchaseSchema");
const Product = require("../schemas/productSchema");
const Supplier = require("../schemas/supplierSchem");
const PurchaseStock = require("../schemas/purchaseStockSchema");

//POST - A new purchase
// router.post("/add", async (req, res) => {
//   try {
//     const { supplier, items, total, paid, paymentMethod } = req.body;

//     // Validate input
//     if (!supplier || !items || !Array.isArray(items) || items.length === 0) {
//       return res.status(400).json({ message: "Invalid purchase data" });
//     }

//     const purchaseItems = [];

//     // Loop through each item
//     for (const item of items) {
//       const { productId, quantity, purchasePrice } = item;

//       const product = await Product.findById(productId);

//       if (!product) {
//         return res
//           .status(404)
//           .json({ message: `Product not found: ${productId}` });
//       }

//       // Update product quantity and purchase price
//       product.quantity += quantity;
//       product.currentPurchasePrice = purchasePrice;
//       await product.save();

//       purchaseItems.push({
//         product: productId,
//         quantity,
//         purchasePrice,
//       });
//     }

//     // Create new purchase record
//     const newPurchase = new Purchase({
//       supplier,
//       items: purchaseItems,
//       total,
//       paid,
//       due: total - paid,
//       paymentMethod,
//     });

//     await newPurchase.save();

//     res.status(201).json({
//       message: "Purchase successful",
//       purchase: newPurchase,
//     });
//   } catch (error) {
//     console.error("Purchase error:", error);
//     res.status(500).json({
//       message: "Something went wrong",
//       error: error.message,
//     });
//   }
// });

router.post("/add", async (req, res) => {
  try {
    const {
      supplier: supplierId,
      items,
      total,
      paid,
      paymentMethod,
    } = req.body;

    // Validation
    if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Invalid purchase data" });
    }

    // Fetch supplier
    const supplierData = await Supplier.findById(supplierId);
    if (!supplierData) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    const purchaseItems = [];

    for (const item of items) {
      const {
        productId,
        quantity,
        purchasePrice,
        retailPrice,
        wholesalePrice,
      } = item;

      const product = await Product.findById(productId);
      if (!product) {
        return res
          .status(404)
          .json({ message: `Product not found: ${productId}` });
      }

      // Update product stock and prices
      product.quantity += quantity;
      product.purchasePrice = purchasePrice;

      if (retailPrice !== undefined) {
        product.retailPrice = retailPrice;
      }

      if (wholesalePrice !== undefined) {
        product.wholesalePrice = wholesalePrice;
      }

      await product.save();

      // Push into purchase item array
      purchaseItems.push({
        product: productId,
        quantity,
        purchasePrice,
        retailPrice,
        wholesalePrice,
      });

      // FIFO stock entry
      const stockEntry = new PurchaseStock({
        product: productId,
        purchasePrice,
        quantity,
        remainingQuantity: quantity,
        purchaseDate: new Date(),
        retailPrice,
        wholesalePrice,
      });

      await stockEntry.save();
    }

    const due = Math.max(total - paid, 0);

    const newPurchase = new Purchase({
      supplier: {
        _id: supplierData._id,
        name: supplierData.name,
        phone: supplierData.phone,
      },
      items: purchaseItems,
      total,
      paid,
      due,
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
      data: purchases,
    });
  } catch (error) {
    console.error("Purchase error:", error);
    res.status(500).json({
      message: "Something went wrong",
      error: error.message,
    });
  }
});

module.exports = router;
