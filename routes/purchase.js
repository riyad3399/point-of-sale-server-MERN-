const express = require("express");
const router = express.Router();
const Purchase = require("../schemas/purchaseSchema");
const Product = require("../schemas/productSchema");
const Supplier = require("../schemas/supplierSchem");
const PurchaseStock = require("../schemas/purchaseStockSchema");

//POST - A new purchase
router.post("/add", async (req, res) => {
  try {
    const {
      supplier,
      supplierId,
      items,
      total,
      discountPercent,
      discount,
      shippingCost,
      grandTotal,
      paid,
      due,
      paymentMethod,
      status,
      dueDate,
      purchaseDate,
    } = req.body;

    // Validation
    if (!supplierId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Invalid purchase data" });
    }

    // Check supplier existence
    const supplierData = await Supplier.findById(supplierId);
    if (!supplierData) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    const purchaseItems = [];

    for (const item of items) {
      const { product, quantity, purchasePrice, retailPrice, wholesalePrice } =
        item;

      const productData = await Product.findById(product);
      if (!productData) {
        return res
          .status(404)
          .json({ message: `Product not found: ${product}` });
      }

      // Update stock and prices
      productData.quantity += quantity;
      productData.purchasePrice = purchasePrice;
      if (retailPrice !== undefined) productData.retailPrice = retailPrice;
      if (wholesalePrice !== undefined)
        productData.wholesalePrice = wholesalePrice;
      await productData.save();

      purchaseItems.push({
        product,
        quantity,
        purchasePrice,
        retailPrice,
        wholesalePrice,
      });

      // Create FIFO stock entry
      await new PurchaseStock({
        product,
        purchasePrice,
        quantity,
        remainingQuantity: quantity,
        purchaseDate: new Date(purchaseDate),
        retailPrice,
        wholesalePrice,
      }).save();
    }

    // Final Save
    const newPurchase = new Purchase({
      supplier,
      supplierId,
      items: purchaseItems,
      total,
      discountPercent,
      discount,
      transportCost: shippingCost,
      grandTotal,
      paid,
      due,
      paymentMethod,
      status,
      dueDate,
      purchaseDate,
    });

    await newPurchase.save();

    res.status(201).json({
      message: "Purchase added successfully",
      purchase: newPurchase,
    });
  } catch (error) {
    res.status(500).json({
      message: "Something went wrong",
      error: error.message,
    });
  }
});

// POST - update a payment
router.put("/:id/pay", async (req, res) => {
  const { id } = req.params;
  const { amount, method,note } = req.body;

  try {
    const purchase = await Purchase.findById(id);
    if (!purchase) return res.status(404).json({ message: "Purchase not found" });

    purchase.paid += amount;
    purchase.due -= amount;

    purchase.payments.push({
      amount,
      method,
      note: note || "",
      date: new Date(),
    });    

    await purchase.save();
    res.json({ message: "Payment updated", purchase });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
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

// GET - single purchase
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "Invalid purchase ID" });
  }

  try {
    const purchase = await Purchase.findById(id);

    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }

    res.json(purchase);
  } catch (error) {
    console.error("Error fetching purchase:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
