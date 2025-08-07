// server.js

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const passport = require("passport");
const tenantMiddleware = require("./middlewares/tenantMiddleware");
const { getGlobalConnection } = require("./db/globalConnection");
require("colors");
require("./config/passport");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

//  Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

//  Authentication Routes (no tenant middleware needed)
app.use("/auth", require("./routes/auth"));
app.use("/admin", require("./routes/admin"));

//  Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: "Server is running",
    timestamp: new Date().toISOString() 
  });
});

//  Tenant Middleware (applies to tenant-specific routes)
app.use(tenantMiddleware);

//  Tenant-specific Routes (require tenant context)
app.use("/product", require("./routes/products"));
app.use("/category", require("./routes/categories"));
app.use("/customer", require("./routes/customer"));
app.use("/invoice", require("./routes/invoice"));
app.use("/setting", require("./routes/setting"));
app.use("/sms", require("./routes/sms"));
app.use("/quotations", require("./routes/quotation"));
app.use("/expenses", require("./routes/expense"));
app.use("/purchases", require("./routes/purchase"));
app.use("/suppliers", require("./routes/suppliers"));
app.use("/user", require("./routes/user"));

//  Static files (e.g. images, uploads)
app.use("/uploads", express.static(path.join(__dirname, "/uploads")));

//  404 fallback
app.use((req, res, next) => {
  res.status(404).json({ message: "Route not found" });
});

//  Global error handler (optional)
app.use((err, req, res, next) => {
  console.error("Global error:", err);
  res
    .status(500)
    .json({ message: "Internal Server Error", error: err.message });
});

//  Initialize Global Database and Start Server
const startServer = async () => {
  try {
    await getGlobalConnection();
    console.log("✅ Global database initialized".green);

    app.listen(PORT, () => {
      console.log(`🚀 Server is running at http://localhost:${PORT}`.bgCyan);
      console.log(`📊 Global database: ${process.env.GLOBAL_DB_NAME}`.yellow);
      console.log(`🏢 Multi-tenant architecture ready`.magenta);
    });
  } catch (error) {
    console.error("❌ Failed to start server:".red, error);
    process.exit(1);
  }
};

startServer();
