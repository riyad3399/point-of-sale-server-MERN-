const express = require("express");
const router = express.Router();
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");
const Product = require("../schemas/productSchema");
const PurchaseStock = require("../schemas/purchaseStockSchema")
const multer = require("multer");


const generateUniqueCode = async () => {
  let code;
  let exists = true;

  while (exists) {
    code = Math.floor(100000 + Math.random() * 900000).toString();
    const product = await Product.findOne({ productCode: code });
    if (!product) exists = false;
  }

  return code;
};

//  Storage for CSV files (on disk)
const storageCsv = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.fieldname}${ext}`);
  },
});

const uploadCsv = multer({
  storage: storageCsv,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("শুধুমাত্র .csv ফাইল আপলোড করা যাবে"));
    }
  },
});

// Multer setup
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// POST- A product
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
      color,
      size,
      description,
    } = req.body;

    const photo = req.file ? req.file.buffer : undefined;

    const product = new Product({
      productName,
      productCode: sku,
      category,
      brand,
      purchasePrice: parseFloat(purchasePrice),
      retailPrice: parseFloat(retailPrice),
      wholesalePrice: parseFloat(wholesalePrice),
      quantity: parseInt(quantity),
      alertQuantity: parseInt(alertQuantity),
      unit,
      tax: parseFloat(tax),
      taxType,
      color,
      size,
      Description: description,
      photo,
    });

    const savedProduct = await product.save(); // ✅ First save the product

    // 🟡 Now create the FIFO stock entry
    const initialStock = new PurchaseStock({
      product: savedProduct._id,
      purchasePrice: savedProduct.purchasePrice,
      quantity: savedProduct.quantity,
      remainingQuantity: savedProduct.quantity,
      purchaseDate: new Date(),
      retailPrice: savedProduct.retailPrice,
      wholesalePrice: savedProduct.wholesalePrice,
    });

    await initialStock.save();

    res.status(201).json(savedProduct);
  } catch (error) {
    console.error("Product creation error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
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
// router.patch("/:id", upload.single("photo"), async (req, res) => {
//   try {
//     const updates = { ...req.body };

//     if (req.file) {
//       updates.photo = req.file.buffer;
//     }

//     const updatedProduct = await Product.findByIdAndUpdate(
//       req.params.id,
//       { $set: updates },
//       { new: true, runValidators: true }
//     );

//     if (!updatedProduct) {
//       return res.status(404).json({ message: "Product Not Found" });
//     }

//     res.status(200).json(updatedProduct);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Failed to update product" });
//   }
// });

router.patch("/:id", upload.single("photo"), async (req, res) => {
  try {
    const { quantity, purchasePrice, ...restUpdates } = req.body;
    const updates = { ...restUpdates };

    if (req.file) {
      updates.photo = req.file.buffer;
    }

    if (quantity) {
      return res.status(400).json({
        message:
          "You cannot directly update quantity. Please use the purchase system to adjust stock.",
      });
    }

    if (purchasePrice) {
      updates.purchasePrice = parseFloat(purchasePrice);
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(updatedProduct);
  } catch (err) {
    console.error("Product update error:", err.message);
    res
      .status(500)
      .json({ message: "Failed to update product", error: err.message });
  }
});


// GET - low stock Product
router.get("/low-stock", async (req, res) => {
  try {
    const lowStockProducts = await Product.find({
      $expr: { $lte: ["$quantity", "$alertQuantity"] },
    });

    res.status(200).json(lowStockProducts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


// GET - All products
// router.get("/", async (req, res) => {
//   try {
//     const products = await Product.find().select("-photo") // photo exclude
//     res.status(200).json(products);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Failed to fetch products" });
//   }
// });

router.get("/", async (req, res) => {
  try {
    const products = await Product.find().select("-photo").lean();

    const fifoProducts = await Promise.all(
      products.map(async (product) => {
        const stockEntries = await PurchaseStock.find({
          product: product._id,
          remainingQuantity: { $gt: 0 },
        })
          .sort({ purchaseDate: 1 }) // FIFO
          .select(
            "purchasePrice retailPrice wholesalePrice remainingQuantity purchaseDate -_id"
          )
          .lean();

        return {
          ...product,
          fifoStock: stockEntries, // 🔁 now includes retail & wholesale price from stock entry
        };
      })
    );

    res.status(200).json(fifoProducts);
  } catch (error) {
    console.error("FIFO fetch error:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch products with FIFO stock" });
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

// 📥 CSV Upload Route
router.post("/upload-csv", uploadCsv.single("csv"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "CSV ফাইল পাওয়া যায়নি" });
    }

    const filePath = req.file.path;
    const parsedData = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => {
        parsedData.push(data);
      })
      .on("end", async () => {
        try {
          const results = [];

          for (const row of parsedData) {
            const productCode = await generateUniqueCode(); // 🔐 Unique code

            results.push({
              productName: row.productName,
              productCode,
              category: row.category,
              brand: row.brand,
              purchasePrice: Number(row.purchasePrice),
              retailPrice: Number(row.retailPrice),
              wholesalePrice: Number(row.wholesalePrice),
              quantity: Number(row.quantity),
              alertQuantity: Number(row.alertQuantity),
              unit: row.unit,
              tax: Number(row.tax),
              taxType: row.taxType,
              color: row.color?.toLowerCase(),
              size: row.size,
              Description: row.Description,
            });
          }

          const inserted = await Product.insertMany(results);
          fs.unlinkSync(filePath);
          res.status(201).json({
            message: `${inserted.length} টি প্রোডাক্ট সফলভাবে যুক্ত হয়েছে`,
          });
        } catch (err) {
          console.error("❌ MongoDB insert error:", err);
          res.status(500).json({
            message: "ডেটা ইনসার্টে সমস্যা হয়েছে",
            error: err.message,
          });
        }
      })
      .on("error", (err) => {
        console.error("❌ CSV Parse Error:", err);
        fs.unlinkSync(filePath);
        res.status(500).json({
          message: "CSV ফাইল প্রসেসে সমস্যা হয়েছে",
          error: err.message,
        });
      });
  } catch (err) {
    console.error("❌ CSV Upload Error:", err);
    res.status(500).json({
      message: "সার্ভারে সমস্যা হয়েছে",
      error: err.message,
    });
  }
});


module.exports = router;
