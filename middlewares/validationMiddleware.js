// middlewares/validationMiddleware.js - Input Validation Middleware

const { body, param, query, validationResult } = require("express-validator");
const securityConfig = require("../config/security");
const winston = require("winston");

// Logger setup
const logger = winston.createLogger({
  level: "warn",
  format: winston.format.json(),
  defaultMeta: { service: "validation" },
  transports: [
    new winston.transports.File({ filename: "logs/validation-errors.log" }),
  ],
});

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    logger.warn("Validation failed", {
      ip: req.ip,
      path: req.path,
      errors: errors.array(),
    });

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
      })),
    });
  }
  
  next();
};

// Common validators
const validators = {
  // User registration validation
  register: [
    body("userName")
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage("Username must be between 3 and 30 characters")
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage("Username can only contain letters, numbers, underscores, and hyphens")
      .escape(),
    
    body("email")
      .trim()
      .isEmail()
      .withMessage("Invalid email address")
      .normalizeEmail()
      .toLowerCase(),
    
    body("password")
      .isLength({ min: 8, max: 128 })
      .withMessage("Password must be between 8 and 128 characters")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage("Password must contain uppercase, lowercase, number, and special character"),
    
    body("tenantName")
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Tenant name must be between 2 and 100 characters")
      .escape(),
    
    body("firstName")
      .optional()
      .trim()
      .isAlpha()
      .withMessage("First name must contain only letters")
      .escape(),
    
    body("lastName")
      .optional()
      .trim()
      .isAlpha()
      .withMessage("Last name must contain only letters")
      .escape(),
    
    body("phone")
      .optional()
      .trim()
      .matches(/^[0-9+\-() ]+$/)
      .withMessage("Invalid phone number format"),
    
    handleValidationErrors,
  ],

  // Login validation
  login: [
    body("userName")
      .trim()
      .notEmpty()
      .withMessage("Username is required")
      .escape(),
    
    body("password")
      .notEmpty()
      .withMessage("Password is required"),
    
    handleValidationErrors,
  ],

  // MongoDB ID validation
  mongoId: [
    param("id")
      .isMongoId()
      .withMessage("Invalid ID format"),
    
    handleValidationErrors,
  ],

  // Product validation
  product: [
    body("productName")
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Product name must be between 1 and 200 characters")
      .escape(),
    
    body("productCode")
      .optional()
      .isNumeric()
      .withMessage("Product code must be numeric"),
    
    body("category")
      .trim()
      .notEmpty()
      .withMessage("Category is required")
      .escape(),
    
    body("purchasePrice")
      .isFloat({ min: 0 })
      .withMessage("Purchase price must be a positive number"),
    
    body("retailPrice")
      .isFloat({ min: 0 })
      .withMessage("Retail price must be a positive number"),
    
    body("wholesalePrice")
      .isFloat({ min: 0 })
      .withMessage("Wholesale price must be a positive number"),
    
    body("quantity")
      .isInt({ min: 0 })
      .withMessage("Quantity must be a non-negative integer"),
    
    handleValidationErrors,
  ],

  // Category validation
  category: [
    body("categoryName")
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Category name must be between 1 and 100 characters")
      .escape(),
    
    body("status")
      .optional()
      .isIn(["Active", "Inactive", "Pending"])
      .withMessage("Status must be Active, Inactive, or Pending"),
    
    handleValidationErrors,
  ],

  // Customer validation
  customer: [
    body("customerName")
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Customer name must be between 1 and 100 characters")
      .escape(),
    
    body("phone")
      .trim()
      .matches(/^[0-9+\-() ]+$/)
      .withMessage("Invalid phone number format"),
    
    body("address")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Address must be less than 500 characters")
      .escape(),
    
    handleValidationErrors,
  ],

  // Invoice validation
  invoice: [
    body("saleSystem")
      .isIn(["wholeSale", "retailSale"])
      .withMessage("Sale system must be wholeSale or retailSale"),
    
    body("customer.name")
      .trim()
      .notEmpty()
      .withMessage("Customer name is required")
      .escape(),
    
    body("customer.phone")
      .trim()
      .notEmpty()
      .withMessage("Customer phone is required"),
    
    body("paymentMethod")
      .isIn(["cash", "bkash", "nagad", "bank", "card"])
      .withMessage("Invalid payment method"),
    
    body("items")
      .isArray({ min: 1 })
      .withMessage("At least one item is required"),
    
    body("items.*.quantity")
      .isInt({ min: 1 })
      .withMessage("Item quantity must be at least 1"),
    
    body("items.*.price")
      .isFloat({ min: 0 })
      .withMessage("Item price must be a positive number"),
    
    handleValidationErrors,
  ],

  // Pagination validation
  pagination: [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    
    query("sort")
      .optional()
      .isIn(["asc", "desc", "1", "-1"])
      .withMessage("Sort must be asc, desc, 1, or -1"),
    
    handleValidationErrors,
  ],

  // Search validation
  search: [
    query("q")
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Search query must be between 1 and 100 characters")
      .escape(),
    
    handleValidationErrors,
  ],
};

// Custom validation middleware for detecting malicious patterns
const detectMaliciousPatterns = (req, res, next) => {
  const checkString = (str) => {
    if (typeof str !== "string") return false;
    
    for (let pattern of securityConfig.blockedPatterns) {
      if (pattern.test(str)) {
        return true;
      }
    }
    return false;
  };

  const checkObject = (obj) => {
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        
        if (typeof value === "string" && checkString(value)) {
          return true;
        } else if (typeof value === "object" && value !== null) {
          if (checkObject(value)) return true;
        }
      }
    }
    return false;
  };

  // Check all request data
  const isMalicious = 
    checkObject(req.body || {}) ||
    checkObject(req.query || {}) ||
    checkObject(req.params || {});

  if (isMalicious) {
    logger.error("Malicious pattern detected", {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get("user-agent"),
    });

    return res.status(403).json({
      success: false,
      message: "Forbidden: Invalid request detected",
    });
  }

  next();
};

// File upload validation
const fileUploadValidation = (allowedTypes = [], maxSize = 5 * 1024 * 1024) => {
  return (req, res, next) => {
    if (!req.file && !req.files) {
      return next();
    }

    const files = req.files || [req.file];
    
    for (let file of files) {
      // Check file size
      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: `File ${file.originalname} exceeds maximum size of ${maxSize / 1024 / 1024}MB`,
        });
      }

      // Check file type
      if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: `File type ${file.mimetype} is not allowed`,
        });
      }

      // Check for double extensions
      const filename = file.originalname.toLowerCase();
      const doubleExtPattern = /\.(php|exe|sh|bat|cmd|com|cgi|jar|app|deb|rpm)\./i;
      
      if (doubleExtPattern.test(filename)) {
        logger.error("Suspicious file upload attempt", {
          ip: req.ip,
          filename: file.originalname,
        });

        return res.status(403).json({
          success: false,
          message: "Forbidden: Invalid file name",
        });
      }
    }

    next();
  };
};

module.exports = {
  validators,
  detectMaliciousPatterns,
  fileUploadValidation,
  handleValidationErrors,
};