const express = require("express");
const router = express.Router();
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

// const generateUniqueCode = async (Product) => {
//   let code;
//   let exists = true;

//   while (exists) {
//     code = Math.floor(100000 + Math.random() * 900000).toString();
//     const product = await Product.findOne({ productCode: code });
//     if (!product) exists = false;
//   }

//   return code;
// };

// Storage for CSV files (on disk)
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
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// POST - Add a product
router.post("/", upload.single("photo"), async (req, res) => {
  try {
    const { Product, PurchaseStock } = req.models;

    let {
      productName,
      barcode,
      barcodeType,
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

    console.log("incoming body:", req.body);

    const photo = req.file ? `/uploads/${req.file.filename}` : "https://yourcdn.com/default.png";

    // normalize numeric fields
    purchasePrice = isNaN(parseFloat(purchasePrice)) ? 0 : parseFloat(purchasePrice);
    retailPrice = isNaN(parseFloat(retailPrice)) ? 0 : parseFloat(retailPrice);
    wholesalePrice = isNaN(parseFloat(wholesalePrice)) ? 0 : parseFloat(wholesalePrice);
    quantity = isNaN(parseInt(quantity)) ? 0 : parseInt(quantity, 10);
    alertQuantity = isNaN(parseInt(alertQuantity)) ? 0 : parseInt(alertQuantity, 10);
    tax = isNaN(parseFloat(tax)) ? 0 : parseFloat(tax);

    const validUnits = ["pcs", "kg", "ltr"];
    if (!validUnits.includes(unit)) {
      unit = "pcs";
    }

    const validTaxTypes = ["inclusive", "exclusive"];
    if (!validTaxTypes.includes(taxType)) {
      taxType = "inclusive";
    }

    // ---------- helper functions ----------
    const randomDigits = (len) =>
      Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join("");

    // compute mod10 checksum used by EAN/UPC (reverse-weight method)
    const computeMod10Checksum = (dataDigits) => {
      const digits = dataDigits.split("").map((d) => parseInt(d, 10)).reverse();
      let sum = 0;
      for (let i = 0; i < digits.length; i++) {
        sum += digits[i] * (i % 2 === 0 ? 3 : 1);
      }
      const checksum = (10 - (sum % 10)) % 10;
      return String(checksum);
    };

    const generateBarcodeByType = (type) => {
      const t = (type || "").toLowerCase();
      if (t === "ean-13" || t === "ean13") {
        const d12 = randomDigits(12);
        return d12 + computeMod10Checksum(d12);
      }
      if (t === "ean-8" || t === "ean8") {
        const d7 = randomDigits(7);
        return d7 + computeMod10Checksum(d7);
      }
      if (t === "upc-a" || t === "upca" || t === "upc") {
        const d11 = randomDigits(11);
        return d11 + computeMod10Checksum(d11);
      }
      if (t === "code-39" || t === "code39") {
        // simple alphanumeric token suitable for Code39 (keeps it human-readable)
        return `C39-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      }
      if (t === "code-128" || t === "code128") {
        return `C128-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
      }
      // fallback
      return `${Date.now()}${randomDigits(3)}`;
    };

    // try to generate a unique barcode (max attempts)
    const generateUniqueBarcode = async (type, attempts = 8) => {
      for (let i = 0; i < attempts; i++) {
        const candidate = generateBarcodeByType(type);
        // ensure candidate is string
        const exists = await Product.findOne({ barcode: String(candidate) }).lean();
        if (!exists) return String(candidate);
      }
      throw new Error("Unable to generate unique barcode after multiple attempts");
    };
    // -------------------------------------

    // If client sent barcode equal to a "type token" (e.g. "upc-a"), generate one on server
    const typeTokens = ["upc-a", "ean-13", "ean-8", "code-39", "code-128"];
    if (typeTokens.includes(String(barcode).toLowerCase())) {
      barcode = await generateUniqueBarcode(String(barcode).toLowerCase());
    } else {
      // if user provided a custom barcode value, ensure it's unique
      if (barcode) {
        const found = await Product.findOne({ barcode: String(barcode) }).lean();
        if (found) {
          return res.status(409).json({ message: "Provided barcode already exists. Choose another or let the server generate one." });
        }
      } else {
        // no barcode provided — generate a sensible default (Code128-like)
        barcode = await generateUniqueBarcode("code-128");
      }
    }

    // Build product document
    const product = new Product({
      productName,
      barcode: String(barcode),
      barcodeType,
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
      description: description || "no description",
      photo,
    });

    const savedProduct = await product.save();

    //  FIFO stock entry
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

    return res.status(201).json(savedProduct);
  } catch (error) {
    console.error("Product creation error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});


// DELETE - A product
router.delete("/:id", async (req, res) => {
  try {
    const { Product } = req.models;

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
    const { Product } = req.models;

    const updates = { ...req.body };

    // photo থাকলে আপডেট
    if (req.file) {
      updates.photo = `/uploads/${req.file.filename}`;
    }

    // খালি string remove করা
    Object.keys(updates).forEach((key) => {
      if (updates[key] === "" || updates[key] === null) {
        delete updates[key];
      }
    });

    //  quantity remove করা (user update করতে পারবে না)
    if (updates.quantity !== undefined) {
      delete updates.quantity;
    }

    // সংখ্যা safe conversion
    if (updates.purchasePrice !== undefined)
      updates.purchasePrice = parseFloat(updates.purchasePrice);

    if (updates.retailPrice !== undefined)
      updates.retailPrice = parseFloat(updates.retailPrice);

    if (updates.wholesalePrice !== undefined)
      updates.wholesalePrice = parseFloat(updates.wholesalePrice);

    if (updates.tax !== undefined) updates.tax = parseFloat(updates.tax);

    if (updates.alertQuantity !== undefined)
      updates.alertQuantity = parseInt(updates.alertQuantity);

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to update product", error: err.message });
  }
});

// GET - low stock Product
router.get("/low-stock", async (req, res) => {
  try {
    const { Product } = req.models;

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
router.get("/", async (req, res) => {
  try {
    const { Product, PurchaseStock } = req.models;

    const products = await Product.find().lean();

    const fifoProducts = await Promise.all(
      products.map(async (product) => {
        const stockEntries = await PurchaseStock.find({
          product: product._id,
          remainingQuantity: { $gt: 0 },
        })
          .sort({ purchaseDate: 1 })
          .select(
            "purchasePrice retailPrice wholesalePrice remainingQuantity purchaseDate -_id"
          )
          .lean();

        return {
          ...product,
          fifoStock: stockEntries,
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

router.get("/image/:id", async (req, res) => {
  try {
    const { Product } = req.models;

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

// CSV Upload Route
router.post("/upload-csv", uploadCsv.single("csv"), async (req, res) => {
  try {
    const { Product, PurchaseStock } = req.models; // PurchaseStock model add
    if (!req.file) {
      return res.status(400).json({ message: "CSV File Not Found!" });
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
          for (const row of parsedData) {
            const productCode = await generateUniqueCode(Product);

            const parseNumber = (val) => {
              const num = Number(String(val).trim());
              return isNaN(num) ? 0 : num;
            };

            // 1️⃣ Create product
            const newProduct = new Product({
              productName: row.productName,
              productCode,
              category: row.category,
              brand: row.brand,
              purchasePrice: parseNumber(row.purchasePrice),
              retailPrice: parseNumber(row.retailPrice),
              wholesalePrice: parseNumber(row.wholesalePrice),
              quantity: parseNumber(row.quantity),
              alertQuantity: parseNumber(row.alertQuantity),
              unit: row.unit,
              tax: parseNumber(row.tax),
              taxType: row.taxType,
              color: row.color?.toLowerCase(),
              size: row.size,
              description: row.Description,
            });

            const savedProduct = await newProduct.save();

            // 2️⃣ Create initial purchaseStock for CSV quantity
            if (parseNumber(row.quantity) > 0) {
              await PurchaseStock.create({
                product: savedProduct._id,
                purchasePrice: parseNumber(row.purchasePrice),
                retailPrice: parseNumber(row.retailPrice),
                wholesalePrice: parseNumber(row.wholesalePrice),
                quantity: parseNumber(row.quantity),
                remainingQuantity: parseNumber(row.quantity),
                purchaseDate: new Date(),
              });
            }
          }

          fs.unlinkSync(filePath);
          res.status(201).json({
            message: `${parsedData.length} products added successfully`,
          });
        } catch (err) {
          console.error("MongoDB insert error:", err);
          res.status(500).json({
            message: "database insert error",
            error: err.message,
          });
        }
      })
      .on("error", (err) => {
        console.error("CSV Parse Error:", err);
        fs.unlinkSync(filePath);
        res.status(500).json({
          message: "CSV file parse error",
          error: err.message,
        });
      });
  } catch (err) {
    console.error("CSV Upload Error:", err);
    res.status(500).json({
      message: "server error",
      error: err.message,
    });
  }
});

// GET - single product
router.get("/:id", async (req, res) => {
  try {
    const { Product } = req.models;

    const id = req.params.id;
    const product = await Product.findOne({ _id: id });
    res.status(200).json(product);
  } catch (err) {
    console.log(err);
  }
});

module.exports = router;
