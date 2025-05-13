const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const productRoutes = require("./routes/products");
const categoryRoutes = require("./routes/categories");
const customerRoutes = require("./routes/customer");
const invioceRoutes = require("./routes/invoice");
require("colors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
dotenv.config();
app.use(cors());
app.use(express.json()); // JSON data accept করবে

// Routes
app.use("/pos", productRoutes);
app.use("/category", categoryRoutes);
app.use("/customer", customerRoutes);
app.use("/invoice", invioceRoutes);

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
