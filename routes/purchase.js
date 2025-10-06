const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

// POST - add a new purchase
router.post("/add", async (req, res) => {
  try {
    const { Supplier, Product, PurchaseStock, Purchase } = req.models;

    const {
      supplierId,
      supplierName,
      items,
      total,
      discountPercent = 0,
      discount = 0,
      shippingCost = 0,
      grandTotal,
      paid = 0,
      due = 0,
      paymentMethod,
      status = "Order",
      dueDate,
      purchaseDate,
    } = req.body;

    if (!supplierId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Invalid purchase data" });
    }

    const supplierData = await Supplier.findById(supplierId);
    if (!supplierData) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    const purchaseItems = [];

    for (const item of items) {
      const {
        product,
        category,
        quantity,
        purchasePrice,
        retailPrice,
        wholesalePrice,
      } = item;

      let productData;

      if (mongoose.Types.ObjectId.isValid(product)) {
        productData = await Product.findById(product);
      }

      if (!productData) {
        productData = new Product({
          productName: product,
          category: category,
          quantity: 0,
          purchasePrice,
          retailPrice,
          wholesalePrice,
        });
      }

      productData.quantity += quantity;
      productData.purchasePrice = purchasePrice;
      if (retailPrice !== undefined) productData.retailPrice = retailPrice;
      if (wholesalePrice !== undefined)
        productData.wholesalePrice = wholesalePrice;

      await productData.save();

      purchaseItems.push({
        product: productData._id,
        quantity,
        category: productData.category,
        purchasePrice,
        retailPrice,
        wholesalePrice,
      });

      await new PurchaseStock({
        product: productData._id,
        purchasePrice,
        quantity,
        remainingQuantity: quantity,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        retailPrice,
        wholesalePrice,
      }).save();
    }

    const newPurchase = new Purchase({
      supplierId,
      supplierName,
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
      dueDate: dueDate ? new Date(dueDate) : null,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
    });

    await newPurchase.save();

    res.status(201).json({
      message: "Purchase added successfully",
      purchase: newPurchase,
    });
  } catch (error) {
    console.error("Error adding purchase:", error);
    res.status(500).json({
      message: "Server error while adding purchase",
      error: error.message,
    });
  }
});

// DELETE - delete a purchase
router.delete("/:id", async (req, res) => {
  try {
    const { Purchase } = req.models;

    const deleted = await Purchase.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });

    const updatedProducts = await Purchase.find(); // Fetch updated list
    res.status(200).json(updatedProducts);
  } catch (err) {
    res.status(500).json({ message: "Error deleting product" });
  }
});

// POST - update a payment
router.put("/:id/pay", async (req, res) => {
  const { id } = req.params;
  const { amount, method, note } = req.body;

  try {
    const { Purchase } = req.models;

    const purchase = await Purchase.findById(id);
    if (!purchase)
      return res.status(404).json({ message: "Purchase not found" });

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
    const { Purchase } = req.models;

    const purchases = await Purchase.aggregate([
      { $sort: { _id: -1 } },

      // 1) items থেকে একটি parallel array বানাও যেখানে প্রতিটি product id
      //    string হলে ObjectId-এ convert করা আছে, আর ObjectId থাকলে আগেরটাই থাকবে।
      {
        $addFields: {
          productIdArray: {
            $map: {
              input: { $ifNull: ["$items", []] },
              as: "it",
              in: {
                $cond: [
                  { $eq: [{ $type: "$$it.product" }, "string"] },
                  { $toObjectId: "$$it.product" }, // যদি string -> convert
                  "$$it.product", // না হলে আগেরটা (ObjectId) রাখো
                ],
              },
            },
          },
        },
      },

      // 2) productIdArray-এ যেসব id আছে সেগুলো নিয়ে products collection থেকে relevant docs আনা
      {
        $lookup: {
          from: "products", // তোমার products collection name নিশ্চিত করো
          let: { pids: "$productIdArray" },
          pipeline: [
            { $match: { $expr: { $in: ["$_id", "$$pids"] } } },
            { $project: { name: 1, productName: 1 } }, // productName বা name যেটা আছে তা নাও
          ],
          as: "product_docs",
        },
      },

      // 3) এখন items-কে index দিয়ে map করে প্রতিটি item-এ matched product থেকে productName যোগ করো
      {
        $addFields: {
          items: {
            $map: {
              // iterate indexes so we can access corresponding productIdArray element
              input: { $range: [0, { $size: { $ifNull: ["$items", []] } }] },
              as: "ix",
              in: {
                $let: {
                  vars: {
                    item: { $arrayElemAt: ["$items", "$$ix"] },
                    pid: { $arrayElemAt: ["$productIdArray", "$$ix"] },
                  },
                  in: {
                    $mergeObjects: [
                      "$$item",
                      {
                        productName: {
                          $let: {
                            vars: {
                              matched: {
                                $arrayElemAt: [
                                  {
                                    $filter: {
                                      input: "$product_docs",
                                      cond: { $eq: ["$$this._id", "$$pid"] },
                                    },
                                  },
                                  0,
                                ],
                              },
                            },
                            in: {
                              $ifNull: [
                                "$$matched.productName",
                                "$$matched.name",
                                null,
                              ],
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },

      // 4) intermediate helper arrays বাদ দাও
      {
        $project: {
          product_docs: 0,
          productIdArray: 0,
        },
      },
    ]);

    return res.status(200).json({
      message: "Fetched purchases with productName added to items",
      data: purchases,
    });
  } catch (error) {
    console.error("Purchase aggregation error:", error);
    return res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
});

router.get("/by-supplier/:supplierId", async (req, res) => {
  try {
    const { Purchase } = req.models;
    const supplierId = req.params.supplierId;

    if (!supplierId) {
      return res.status(400).json({ message: "supplierId is required" });
    }

    const purchases = await Purchase.aggregate([
      {
        $match: {
          $or: [
            {
              supplierId: mongoose.Types.ObjectId.isValid(supplierId)
                ? new mongoose.Types.ObjectId(supplierId)
                : supplierId,
            },
            {
              supplier: mongoose.Types.ObjectId.isValid(supplierId)
                ? new mongoose.Types.ObjectId(supplierId)
                : supplierId,
            },
            { supplierName: supplierId },
          ],
        },
      },
      {
        $project: {
          _id: 1,
          invoiceNumber: 1,
          supplierId: 1,
          supplierName: 1,
          purchaseDate: 1,
          total: 1,
          grandTotal: 1,
          items: 1,
        },
      },
      { $sort: { purchaseDate: -1 } },
    ]);

    res.status(200).json({
      message: "Fetched purchases by supplier (via param)",
      data: purchases,
    });
  } catch (error) {
    console.error("Error fetching purchases by supplier:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET - single purchase
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "Invalid purchase ID" });
  }

  try {
    const { Purchase } = req.models;

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

// POST - purchase return
router.post("/return", async (req, res) => {
  const { Product, Purchase, PurchaseReturn } = req.models;

  try {
    const payload = req.body;

    // 🧩 Validation
    if (!payload.purchaseId)
      return res.status(400).json({ message: "purchaseId is required" });
    if (!Array.isArray(payload.items) || payload.items.length === 0)
      return res.status(400).json({ message: "items are required" });

    // 🧩 Normalize items
    const items = payload.items.map((it) => ({
      productId: it.productId ? String(it.productId) : null,
      productName: String(it.productName ?? it.name ?? "Unnamed Item"),
      qty: Number(it.qty ?? 0),
      price: Number(it.price ?? 0),
      discount: Number(it.discount ?? 0),
      lineTotal: Number(it.lineTotal ?? 0),
    }));

    // 🧩 Validate quantities
    for (const it of items) {
      if (!it.qty || it.qty <= 0)
        return res
          .status(400)
          .json({ message: `Invalid qty for "${it.productName}"` });
    }

    // 🧩 Find Purchase document
    const purchase = await Purchase.findById(payload.purchaseId);
    if (!purchase)
      return res.status(404).json({ message: "Purchase not found" });

    const stockUpdates = [];

    // 🧩 Match & update purchase items
    for (const rit of items) {
      const idx = purchase.items.findIndex(
        (pi) => String(pi.product) === String(rit.productId)
      );

      if (idx === -1) {
        return res.status(400).json({
          message: `Item "${rit.productName}" not found in purchase`,
        });
      }

      const pItem = purchase.items[idx];
      const purchasedQty = Number(pItem.quantity ?? 0);
      const returnedQty = Number(pItem.returnedQty ?? 0);
      const remaining = purchasedQty - returnedQty;

      if (rit.qty > remaining) {
        return res.status(400).json({
          message: `Return qty for "${rit.productName}" (${rit.qty}) exceeds remaining (${remaining})`,
        });
      }

      // 🧩 Update purchase item fields
      pItem.returnedQty = returnedQty + rit.qty;
      pItem.quantity = purchasedQty - rit.qty; // ❗ Decrease purchase quantity too

      stockUpdates.push({ productId: rit.productId, qty: rit.qty });
    }

    // 🧩 Save PurchaseReturn document
    const prDoc = new PurchaseReturn({
      purchaseId: payload.purchaseId,
      invoiceNumber: payload.invoiceNumber ?? "",
      supplierId: payload.supplierId ?? null,
      supplierName: payload.supplierName ?? "",
      items,
      totalReturnAmount:
        payload.totalReturnAmount ??
        items.reduce((sum, it) => sum + (it.lineTotal || it.qty * it.price), 0),
      reason: payload.reason ?? "",
      returnDate: payload.returnDate
        ? new Date(payload.returnDate)
        : new Date(),
      createdBy: payload.createdBy ?? "",
    });

    // 🧩 Save both
    await purchase.save();
    const savedReturn = await prDoc.save();

    // 🧩 Update Product stock (decrease)
    for (const su of stockUpdates) {
      await Product.findByIdAndUpdate(
        su.productId,
        { $inc: { quantity: -Math.abs(su.qty) } },
        { new: true }
      );
    }

    for (const su of items) {
      await Purchase.findByIdAndUpdate(
        su.product,
        { $inc: { quantity: -Math.abs(su.qty) } },
        { new: true }
      );
    }

    res.status(201).json({
      message: "Purchase return created successfully",
      data: savedReturn,
    });
  } catch (err) {
    console.error("❌ Error creating purchase return:", err);
    res.status(500).json({
      message: err.message || "Server error",
      error: err.stack,
    });
  }
});

module.exports = router;
