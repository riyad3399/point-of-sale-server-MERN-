const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const passport = require('passport');
const productRoutes = require("./routes/products");
const categoryRoutes = require("./routes/categories");
const customerRoutes = require("./routes/customer");
const invioceRoutes = require("./routes/invoice");
const settingRoutes = require("./routes/setting");
const smsRoutes = require("./routes/sms");
const quotationRoutes = require("./routes/quotation");
const expenseRoutes = require("./routes/expense");
const purchaseRoutes = require("./routes/purchase");
const supplierRoutes = require("./routes/suppliers")
const userRoutes = require("./routes/user");
require("colors");
require("./config/passport")

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.urlencoded({ extended: true }));


// Middleware
dotenv.config();
app.use(cors());
app.use(express.json()); // JSON data accept করবে
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize())


// Routes
app.use("/product", productRoutes);
app.use("/category", categoryRoutes);
app.use("/customer", customerRoutes);
app.use("/invoice", invioceRoutes);
app.use("/setting", settingRoutes);
app.use("/sms", smsRoutes);
app.use("/quotations", quotationRoutes)
app.use("/expenses", expenseRoutes);
app.use("/purchases", purchaseRoutes);
app.use("/suppliers", supplierRoutes)
app.use("/user", userRoutes);

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
