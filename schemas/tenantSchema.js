const mongoose = require("mongoose");

const tenantSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },

  tenantName: {
    type: String,
    required: true,
    trim: true,
  },

  databaseName: {
    type: String,
    required: true,
    unique: true,
  },

  plan: {
    type: String,
    enum: ["trial", "basic", "standard", "premium", "enterprise"],
    default: "trial",
  },

  features: {
    maxUsers: {
      type: Number,
      default: 5,
    },
    maxProducts: {
      type: Number,
      default: 100,
    },
    maxInvoices: {
      type: Number,
      default: 500,
    },
    hasSMS: {
      type: Boolean,
      default: false,
    },
    hasReporting: {
      type: Boolean,
      default: true,
    },
    hasMultipleStores: {
      type: Boolean,
      default: false,
    },
  },

  subscription: {
    status: {
      type: String,
      enum: ["active", "suspended", "cancelled", "trial"],
      default: "trial",
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: Date,
    trialEndsAt: {
      type: Date,
      default: function() {
        return new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      },
    },
  },

  billing: {
    contactEmail: String,
    contactPhone: String,
    address: String,
    city: String,
    country: {
      type: String,
      default: "Bangladesh",
    },
  },

  settings: {
    language: {
      type: String,
      default: "en",
    },
    timezone: {
      type: String,
      default: "Asia/Dhaka",
    },
    currency: {
      type: String,
      default: "BDT",
    },
    dateFormat: {
      type: String,
      default: "DD/MM/YYYY",
    },
  },

  isActive: {
    type: Boolean,
    default: true,
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "GlobalUser",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

tenantSchema.pre("save", function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = tenantSchema;