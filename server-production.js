// server-production.js - Production-Ready Server with Enterprise Security

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
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: "pos-server" },
  transports: [
    // Error logs
    new winston.transports.DailyRotateFile({
      filename: "logs/error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      level: "error",
      maxSize: "20m",
      maxFiles: "30d",
      zippedArchive: true,
    }),
    // Combined logs
    new winston.transports.DailyRotateFile({
      filename: "logs/combined-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "30d",
      zippedArchive: true,
    }),
    // Security logs
    new winston.transports.DailyRotateFile({
      filename: "logs/security-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      level: "warn",
      maxSize: "20m",
      maxFiles: "90d",
      zippedArchive: true,
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

// Trust proxy (for rate limiting behind reverse proxy)
app.set("trust proxy", IS_PRODUCTION ? 1 : false);

// ============= SECURITY MIDDLEWARE =============

// Helmet - Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: !IS_PRODUCTION,
  })
);

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",").map(url => url.trim())
      : [`http://localhost:${PORT}`, process.env.FRONTEND_URL || "http://localhost:5173"];

    // Allow requests with no origin (mobile apps, Postman, etc.) in development
    if (!origin && !IS_PRODUCTION) return callback(null, true);

    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      // Allow exact matches or wildcard subdomains
      return origin === allowedOrigin || 
             (allowedOrigin.includes('*') && new RegExp(allowedOrigin.replace('*', '.*')).test(origin));
    });

    if (isAllowed || !IS_PRODUCTION) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`, {
        origin,
        allowedOrigins,
        userAgent: callback.req?.get('user-agent')
      });
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-tenant-id", "x-requested-with"],
  exposedHeaders: ["x-total-count", "x-page", "x-per-page"],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));

// Compression
app.use(compression());

// Body parsing with size limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// MongoDB injection prevention - Fixed for Express 5
app.use((req, res, next) => {
  // Clean function to recursively remove prohibited characters
  const clean = (data) => {
    if (typeof data === 'string') {
      // Remove MongoDB operators
      return data.replace(/[$]/g, '');
    } else if (Array.isArray(data)) {
      return data.map(clean);
    } else if (data && typeof data === 'object') {
      const cleaned = {};
      for (const key in data) {
        // Skip keys starting with $ or containing dots
        if (key.startsWith('$') || key.includes('.')) {
          logger.warn(`Mongo injection attempt blocked from IP: ${req.ip}, key: ${key}`);
          continue;
        }
        cleaned[key] = clean(data[key]);
      }
      return cleaned;
    }
    return data;
  };

  // Clean request data
  if (req.body) req.body = clean(req.body);
  if (req.query) req.query = clean(req.query);
  if (req.params) req.params = clean(req.params);
  
  next();
});

// XSS protection - Clean user input
app.use((req, res, next) => {
  // Sanitize request body
  if (req.body) {
    for (let key in req.body) {
      if (typeof req.body[key] === "string") {
        req.body[key] = xss(req.body[key]);
      }
    }
  }
  // Sanitize query params
  if (req.query) {
    for (let key in req.query) {
      if (typeof req.query[key] === "string") {
        req.query[key] = xss(req.query[key]);
      }
    }
  }
  next();
});

// Prevent HTTP Parameter Pollution
app.use(hpp());

// ============= RATE LIMITING =============

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes default
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (IS_PRODUCTION ? 100 : 1000),
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
      path: req.path,
      userAgent: req.get('user-agent')
    });
    res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later.",
      retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
    });
  },
});

// Strict rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 5,
  skipSuccessfulRequests: true,
  message: "Too many authentication attempts. Please try again later.",
  handler: (req, res) => {
    logger.error(`Auth rate limit exceeded for IP: ${req.ip}`, {
      path: req.path,
      body: req.body?.userName || 'unknown'
    });
    res.status(429).json({
      success: false,
      message: "Too many authentication attempts. Account temporarily locked.",
      retryAfter: 900 // 15 minutes
    });
  },
});

// API rate limiter for tenant operations
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_API_MAX) || (IS_PRODUCTION ? 60 : 600),
  message: {
    success: false,
    message: "API rate limit exceeded. Please slow down your requests.",
  },
  standardHeaders: true,
});

// Apply general rate limiter to all routes
app.use(generalLimiter);

// ============= REQUEST LOGGING =============

// Morgan HTTP request logging
const morganFormat = IS_PRODUCTION ? "combined" : "dev";
const morganStream = {
  write: (message) => logger.info(message.trim()),
};

app.use(
  morgan(morganFormat, {
    stream: morganStream,
    skip: (req, res) => {
      // Skip health check logs in production
      return IS_PRODUCTION && req.path === "/health";
    },
  })
);

// Custom request logger for suspicious activity
app.use((req, res, next) => {
  // Log suspicious patterns
  const suspiciousPatterns = [
    /\.\.\//gi, // Path traversal
    /<script/gi, // XSS attempt
    /union.*select/gi, // SQL injection
    /eval\(/gi, // Code injection
    /javascript:/gi, // XSS attempt
  ];

  const requestData = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  for (let pattern of suspiciousPatterns) {
    if (pattern.test(requestData)) {
      logger.error(`SECURITY: Suspicious request from IP ${req.ip}`, {
        pattern: pattern.toString(),
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });
      
      return res.status(403).json({
        success: false,
        message: "Forbidden: Invalid request detected",
      });
    }
  }

  next();
});

// ============= PASSPORT INITIALIZATION =============
app.use(passport.initialize());

// ============= PUBLIC ROUTES =============

// Basic health endpoints (no auth required)
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    uptime: process.uptime(),
  });
});

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
      error: "Service not ready",
      timestamp: new Date().toISOString(),
    });
  }
});

// Authentication routes with strict rate limiting
app.use("/auth", authLimiter, require("./routes/auth"));

// Admin routes (super admin only)
app.use("/admin", apiLimiter, require("./routes/admin"));

// ============= PROTECTED ROUTES =============

// Apply API rate limiter and authentication to all protected routes
const protectedRouter = express.Router();
protectedRouter.use(apiLimiter);
protectedRouter.use(globalAuthMiddleware);
protectedRouter.use(tenantMiddleware);

// Mount protected routes
app.use("/product", protectedRouter, require("./routes/products"));
app.use("/category", protectedRouter, require("./routes/categories"));
app.use("/customer", protectedRouter, require("./routes/customer"));
app.use("/invoice", protectedRouter, require("./routes/invoice"));
app.use("/setting", protectedRouter, require("./routes/setting"));
app.use("/sms", protectedRouter, require("./routes/sms"));
app.use("/quotations", protectedRouter, require("./routes/quotation"));
app.use("/expenses", protectedRouter, require("./routes/expense"));
app.use("/purchases", protectedRouter, require("./routes/purchase"));
app.use("/suppliers", protectedRouter, require("./routes/suppliers"));
app.use("/user", protectedRouter, require("./routes/user"));

// ============= STATIC FILES =============

// Serve static files with security
app.use(
  "/uploads",
  express.static(path.join(__dirname, "/uploads"), {
    dotfiles: "ignore",
    index: false,
    maxAge: IS_PRODUCTION ? "7d" : 0,
    setHeaders: (res, path) => {
      // Security headers for static files
      res.set("X-Content-Type-Options", "nosniff");
      res.set("X-Frame-Options", "DENY");
    },
  })
);

// ============= ERROR HANDLING =============

// 404 Handler
app.use((req, res, next) => {
  logger.warn(`404 - Not Found: ${req.method} ${req.path} from IP: ${req.ip}`);
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.path,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  // Log error details
  logger.error("Global error handler:", {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    user: req.globalUser?.userName || "anonymous",
  });

  // Don't leak error details in production
  const message = IS_PRODUCTION
    ? "Internal server error"
    : err.message || "Something went wrong";

  const statusCode = err.statusCode || err.status || 500;

  res.status(statusCode).json({
    success: false,
    message,
    ...(IS_PRODUCTION ? {} : { error: err.message, stack: err.stack }),
  });
});

// ============= UNCAUGHT EXCEPTION HANDLERS =============

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("UNCAUGHT EXCEPTION! Shutting down...", {
    error: error.message,
    stack: error.stack,
  });
  
  // Give time to log the error
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("UNHANDLED REJECTION! Shutting down...", {
    reason,
    promise,
  });

  // Close server and exit
  server.close(() => {
    process.exit(1);
  });
});

// Handle SIGTERM signal (graceful shutdown)
process.on("SIGTERM", () => {
  logger.info("SIGTERM received. Shutting down gracefully...");
  
  server.close(async () => {
    logger.info("Process terminated");
    
    // Close database connections
    try {
      await closeGlobalConnection();
      await closeAllTenantConnections();
      logger.info("Database connections closed");
    } catch (error) {
      logger.error("Error closing database connections:", error);
    }
    
    process.exit(0);
  });
});

// Handle SIGINT signal (Ctrl+C)
process.on("SIGINT", () => {
  logger.info("SIGINT received. Shutting down gracefully...");
  
  server.close(async () => {
    logger.info("Process interrupted");
    
    // Close database connections
    try {
      await closeGlobalConnection();
      await closeAllTenantConnections();
      logger.info("Database connections closed");
    } catch (error) {
      logger.error("Error closing database connections:", error);
    }
    
    process.exit(0);
  });
});

// ============= SERVER STARTUP =============

let server;

const startServer = async () => {
  try {
    // Initialize global database connection
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
    server.timeout = 120000; // 2 minutes
    server.keepAliveTimeout = 65000; // 65 seconds
    server.headersTimeout = 66000; // 66 seconds

  } catch (error) {
    logger.error("❌ Failed to start server:", error);
    console.error("❌ Failed to start server:".red, error);
    process.exit(1);
  }
};

// Start the server
startServer();

// Export for testing
module.exports = app;