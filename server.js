const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const productRoutes = require("./routes/products");
const categoryRoutes = require("./routes/categories");
const customerRoutes = require("./routes/customer");
const invioceRoutes = require("./routes/invoice");
const settingRoutes = require("./routes/setting");
require("colors");

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.urlencoded({ extended: true }));


// Middleware
dotenv.config();
app.use(cors());
app.use(express.json()); // JSON data accept করবে

// Routes
app.use("/product", productRoutes);
app.use("/category", categoryRoutes);
app.use("/customer", customerRoutes);
app.use("/invoice", invioceRoutes);
app.use("/setting", settingRoutes)



// Serve uploaded images statically
// app.use("/uploads", express.static(path.resolve(__dirname, "/uploads")));
app.use("/uploads", express.static(path.join(__dirname, "/uploads")));



// MongoDB connect
mongoose
  .connect(`${process.env.MONGO_URI}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected successfully".bgYellow))
  .catch((error) => console.error("MongoDB connection failed:".bgRed, error));

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`.bgCyan);
});
