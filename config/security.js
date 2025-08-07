// config/security.js - Security Configuration

module.exports = {
  // JWT Configuration
  jwt: {
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || "7d",
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || "30d",
    algorithm: "HS256",
  },

  // Password Policy
  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    specialChars: "!@#$%^&*()_+-=[]{}|;:,.<>?",
  },

  // Account Security
  account: {
    maxLoginAttempts: 5,
    lockoutDuration: 30 * 60 * 1000, // 30 minutes
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    requireEmailVerification: false, // Set to true in production
  },

  // Rate Limiting
  rateLimit: {
    general: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // requests per window
    },
    auth: {
      windowMs: 15 * 60 * 1000,
      max: 5,
    },
    api: {
      windowMs: 1 * 60 * 1000,
      max: 60,
    },
  },

  // File Upload Security
  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/pdf",
      "text/csv",
    ],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".gif", ".pdf", ".csv"],
  },

  // CORS Whitelist
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : [process.env.BACKEND_URL || "http://localhost:3000", process.env.FRONTEND_URL || "http://localhost:5173"],
    allowedMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-tenant-id"],
    credentials: true,
    maxAge: 86400,
  },

  // Security Headers
  headers: {
    frameOptions: "DENY",
    xssProtection: true,
    noSniff: true,
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },

  // Input Validation Rules
  validation: {
    username: {
      min: 3,
      max: 30,
      pattern: /^[a-zA-Z0-9_-]+$/,
    },
    email: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    phone: {
      pattern: /^[0-9+\-() ]+$/,
      min: 10,
      max: 15,
    },
  },

  // Blocked Patterns (for additional security)
  blockedPatterns: [
    /\.\.\//gi, // Path traversal
    /<script/gi, // XSS attempt
    /javascript:/gi, // XSS attempt
    /on\w+\s*=/gi, // Event handlers
    /union.*select/gi, // SQL injection
    /exec\(/gi, // Command injection
    /eval\(/gi, // Code injection
    /setTimeout/gi, // Code injection
    /setInterval/gi, // Code injection
  ],

  // IP Blocking
  ipBlocking: {
    enabled: false, // Set to true if you want to enable IP blocking
    whitelist: [], // Add trusted IPs
    blacklist: [], // Add blocked IPs
  },
};