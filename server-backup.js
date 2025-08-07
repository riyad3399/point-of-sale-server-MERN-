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

//  Protected Routes (require authentication and tenant context)
const globalAuthMiddleware = require("./middlewares/globalAuthMiddleware");

//  Apply global auth middleware and tenant middleware to protected routes
app.use("/product", globalAuthMiddleware, tenantMiddleware, require("./routes/products"));
app.use("/category", globalAuthMiddleware, tenantMiddleware, require("./routes/categories"));
app.use("/customer", globalAuthMiddleware, tenantMiddleware, require("./routes/customer"));
app.use("/invoice", globalAuthMiddleware, tenantMiddleware, require("./routes/invoice"));
app.use("/setting", globalAuthMiddleware, tenantMiddleware, require("./routes/setting"));
app.use("/sms", globalAuthMiddleware, tenantMiddleware, require("./routes/sms"));
app.use("/quotations", globalAuthMiddleware, tenantMiddleware, require("./routes/quotation"));
app.use("/expenses", globalAuthMiddleware, tenantMiddleware, require("./routes/expense"));
app.use("/purchases", globalAuthMiddleware, tenantMiddleware, require("./routes/purchase"));
app.use("/suppliers", globalAuthMiddleware, tenantMiddleware, require("./routes/suppliers"));
app.use("/user", globalAuthMiddleware, tenantMiddleware, require("./routes/user"));

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
