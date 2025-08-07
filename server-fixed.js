// server-fixed.js - Production Server with Bug Fixes

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const passport = require("passport");
const helmet = require("helmet");
const compression = require("compression");
const xss = require("xss");
const hpp = require("hpp");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const winston = require("winston");
require("winston-daily-rotate-file");
require("colors");

// Load environment variables
dotenv.config();

// Import middleware and connections
const tenantMiddleware = require("./middlewares/tenantMiddleware");
const globalAuthMiddleware = require("./middlewares/globalAuthMiddleware");
const { getGlobalConnection, closeGlobalConnection } = require("./db/globalConnection");
const { closeAllTenantConnections } = require("./db/connectionManager");
require("./config/passport");

// ============= WINSTON LOGGER SETUP =============
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "pos-server" },
  transports: [
    new winston.transports.DailyRotateFile({
      filename: "logs/error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      level: "error",
      maxSize: "20m",
      maxFiles: "30d",
    }),
    new winston.transports.DailyRotateFile({
      filename: "logs/combined-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "30d",
    }),
  ],
});

// Console logging in development
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

// ============= EXPRESS APP SETUP =============
const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PRODUCTION = NODE_ENV === "production";

// Trust proxy
app.set("trust proxy", IS_PRODUCTION ? 1 : false);

// ============= SECURITY MIDDLEWARE =============

// Helmet - Basic security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
  crossOriginEmbedderPolicy: false,
}));

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",").map(url => url.trim())
      : [process.env.BACKEND_URL || `http://localhost:${PORT}`, process.env.FRONTEND_URL || "http://localhost:5173"];

    // Allow requests with no origin in development
    if (!origin && !IS_PRODUCTION) return callback(null, true);

    if (allowedOrigins.includes(origin) || !IS_PRODUCTION) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-tenant-id"],
};

app.use(cors(corsOptions));

// Compression
app.use(compression());

// Body parsing with size limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Simple MongoDB injection prevention (Fixed for Express 5)
app.use((req, res, next) => {
  const clean = (obj) => {
    if (obj && typeof obj === 'object') {
      for (let key in obj) {
        if (key.startsWith('$') || key.includes('.')) {
          delete obj[key];
          logger.warn(`Blocked MongoDB operator: ${key} from IP: ${req.ip}`);
        } else if (typeof obj[key] === 'object') {
          clean(obj[key]);
        }
      }
    }
  };

  if (req.body) clean(req.body);
  if (req.query) clean(req.query);
  next();
});

// XSS protection
app.use((req, res, next) => {
  const sanitize = (obj) => {
    if (obj && typeof obj === 'object') {
      for (let key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = xss(obj[key]);
        } else if (typeof obj[key] === 'object') {
          sanitize(obj[key]);
        }
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  next();
});

// Prevent parameter pollution
app.use(hpp());

// ============= RATE LIMITING =============

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: IS_PRODUCTION ? 100 : 1000,
  message: { success: false, message: "Too many requests" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: { success: false, message: "Too many auth attempts" },
});

// API rate limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: IS_PRODUCTION ? 60 : 600,
  message: { success: false, message: "API rate limit exceeded" },
});

app.use(generalLimiter);

// ============= REQUEST LOGGING =============
app.use(morgan(IS_PRODUCTION ? "combined" : "dev"));

// ============= PASSPORT INITIALIZATION =============
app.use(passport.initialize());

// ============= PUBLIC ROUTES =============

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    uptime: process.uptime(),
  });
});

// Readiness check
app.get("/ready", async (req, res) => {
  try {
    const { getGlobalModels } = require("./db/globalConnection");
    const { GlobalUser } = await getGlobalModels();
    await GlobalUser.db.admin().ping();
    
    res.status(200).json({
      ready: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      timestamp: new Date().toISOString(),
    });
  }
});

// Authentication routes
app.use("/auth", authLimiter, require("./routes/auth"));

// Admin routes
app.use("/admin", apiLimiter, require("./routes/admin"));

// ============= PROTECTED ROUTES =============

// Apply API rate limiter and authentication to protected routes
app.use("/product", apiLimiter, globalAuthMiddleware, tenantMiddleware, require("./routes/products"));
app.use("/category", apiLimiter, globalAuthMiddleware, tenantMiddleware, require("./routes/categories"));
app.use("/customer", apiLimiter, globalAuthMiddleware, tenantMiddleware, require("./routes/customer"));
app.use("/invoice", apiLimiter, globalAuthMiddleware, tenantMiddleware, require("./routes/invoice"));
app.use("/setting", apiLimiter, globalAuthMiddleware, tenantMiddleware, require("./routes/setting"));
app.use("/sms", apiLimiter, globalAuthMiddleware, tenantMiddleware, require("./routes/sms"));
app.use("/quotations", apiLimiter, globalAuthMiddleware, tenantMiddleware, require("./routes/quotation"));
app.use("/expenses", apiLimiter, globalAuthMiddleware, tenantMiddleware, require("./routes/expense"));
app.use("/purchases", apiLimiter, globalAuthMiddleware, tenantMiddleware, require("./routes/purchase"));
app.use("/suppliers", apiLimiter, globalAuthMiddleware, tenantMiddleware, require("./routes/suppliers"));
app.use("/user", apiLimiter, globalAuthMiddleware, tenantMiddleware, require("./routes/user"));

// ============= STATIC FILES =============
app.use("/uploads", express.static(path.join(__dirname, "/uploads"), {
  maxAge: IS_PRODUCTION ? "7d" : 0,
}));

// ============= ERROR HANDLING =============

// 404 Handler
app.use((req, res) => {
  logger.warn(`404 - Not Found: ${req.method} ${req.path} from IP: ${req.ip}`);
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error("Global error:", {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  const statusCode = err.statusCode || err.status || 500;
  const message = IS_PRODUCTION ? "Internal server error" : err.message;

  res.status(statusCode).json({
    success: false,
    message,
    ...(IS_PRODUCTION ? {} : { error: err.message }),
  });
});

// ============= PROCESS HANDLERS =============

process.on("uncaughtException", (error) => {
  logger.error("UNCAUGHT EXCEPTION:", { error: error.message, stack: error.stack });
  setTimeout(() => process.exit(1), 1000);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("UNHANDLED REJECTION:", { reason, promise });
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  
  if (server) {
    server.close(async () => {
      try {
        await closeGlobalConnection();
        await closeAllTenantConnections();
        logger.info("Connections closed. Exiting...");
        process.exit(0);
      } catch (error) {
        logger.error("Error during shutdown:", error);
        process.exit(1);
      }
    });
  } else {
    process.exit(0);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// ============= SERVER STARTUP =============

let server;

const startServer = async () => {
  try {
    // Initialize global database
    await getGlobalConnection();
    logger.info("✅ Global database initialized");

    // Start server
    server = app.listen(PORT, () => {
      console.log(`🚀 Server is running at http://localhost:${PORT}`.bgCyan);
      console.log(`📊 Environment: ${NODE_ENV}`.yellow);
      console.log(`🔒 Security: Enhanced`.green);
      console.log(`📝 Logging: Enabled`.magenta);
      console.log(`🏢 Multi-tenant architecture ready`.cyan);
      
      logger.info("Server started successfully", {
        port: PORT,
        environment: NODE_ENV,
        nodeVersion: process.version,
        platform: process.platform,
      });
    });

    // Server timeout settings
    server.timeout = 120000;
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;

  } catch (error) {
    logger.error("❌ Failed to start server:", error);
    console.error("❌ Failed to start server:".red, error);
    process.exit(1);
  }
};

startServer();

module.exports = app;