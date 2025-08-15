const express = require("express");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const router = express.Router();

const uploadFolder = path.join(__dirname, "../uploads"); // routes ফোল্ডার থেকে এক ধাপ উপরে ও uploads

if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadFolder);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// ================== POST - Create Settings (Only Once) ==================
router.post("/", upload.single("logo"), async (req, res) => {
  try {
    const { Setting } = req.models;

    const {
      storeName,
      phone,
      address,
      city,
      state,
      zip,
      email,
      taxRate,
      currency,
    } = req.body;

    const logoPath = req.file
      ? `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`
      : "";

    const setting = new Setting({
      storeName,
      phone,
      address,
      city,
      state,
      zip,
      email,
      taxRate,
      currency,
      logo: logoPath,
    });

    await setting.save();

    res.status(201).json({
      message: "Store settings saved successfully.",
      data: setting,
    });
  } catch (err) {
    console.error("Error saving settings:", err);
    res.status(500).json({ message: "Server error while saving settings." });
  }
});

// ================== PATCH - Update Settings ==================
router.patch("/", upload.single("logo"), async (req, res) => {
  try {
    const { Setting } = req.models;

    const existing = await Setting.findOne();
    if (!existing) {
      return res.status(404).json({ message: "No store settings found" });
    }

    const { storeName, phone, address, city, state, zip, email, currency } =
      req.body;

    // ফাইল আপলোড হলে logo ফিল্ড সেট করবো
    const logoUrl = req.file
      ? `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`
      : null;

    // আপডেট করার জন্য অবজেক্ট তৈরি
    const updateData = {
      ...(storeName && { storeName }),
      ...(phone && { phone }),
      ...(address && { address }),
      ...(city && { city }),
      ...(state && { state }),
      ...(zip && { zip }),
      ...(email && { email }),
      ...(currency && { currency }),
      ...(logoUrl && { logo: logoUrl }), // এখানে "logo" ফিল্ডে রাখতে হবে
    };

    // ডাটাবেজ আপডেট
    const updated = await Setting.findByIdAndUpdate(existing._id, updateData, {
      new: true,
    });

    res.status(200).json({ message: "Store settings updated", data: updated });
  } catch (error) {
    console.error("PATCH /settings error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ================== GET - Fetch Settings ==================
router.get("/", async (req, res) => {
  try {
    const { Setting } = req.models;

    const setting = await Setting.findOne();
    if (!setting) {
      return res.status(404).json({ message: "No store setting found" });
    }
    res.status(200).json({ data: setting });
  } catch (error) {
    console.error("GET /settings error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
