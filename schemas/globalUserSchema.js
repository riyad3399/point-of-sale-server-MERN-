const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const globalUserSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  
  password: {
    type: String,
    required: true,
  },

  tenantId: {
    type: String,
    required: true,
    index: true,
  },

  tenantDatabase: {
    type: String,
    required: true,
  },

  isActive: {
    type: Boolean,
    default: true,
  },

  isSuperAdmin: {
    type: Boolean,
    default: false,
  },

  lastLogin: {
    type: Date,
  },

  loginAttempts: {
    type: Number,
    default: 0,
  },

  lockUntil: {
    type: Date,
  },

  refreshToken: {
    type: String,
  },

  passwordResetToken: {
    type: String,
  },

  passwordResetExpires: {
    type: Date,
  },

  metadata: {
    firstName: String,
    lastName: String,
    phone: String,
    profilePicture: String,
  },

  createdOn: {
    type: Date,
    default: Date.now,
  },
});

globalUserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

globalUserSchema.methods.isAccountLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

globalUserSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = globalUserSchema;