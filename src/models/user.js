import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['buyer', 'seller'],
    default: 'buyer'
  },
  availableRoles: {
    type: [String],
    enum: ['buyer', 'seller'],
    default: ['buyer']
  },
  packages: {
    buyer: {
      type: String,
      enum: ["none", "silver", "gold", "premium"],
      default: "none"
    },
    seller: {
      type: String,
      enum: ["none", "silver", "gold", "premium"],
      default: "none"
    }
  },
  packageExpiry: {
    type: Date,
    default: null
  },
  profilePicture: {
    type: String,
    default: "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png",
  },
  // Password reset fields
  resetPasswordOtp: {
    type: String,
    default: null
  },
  resetPasswordOtpExpiry: {
    type: Date,
    default: null
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordTokenExpiry: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Automatically add both roles to availableRoles
userSchema.pre('save', function(next) {
  if (this.isNew) {
    this.availableRoles = ['buyer', 'seller'];
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Check if user can use a specific role
userSchema.methods.canUseRole = function(role) {
  return this.availableRoles.includes(role);
};

// Generate OTP method
userSchema.methods.generateResetOtp = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.resetPasswordOtp = otp;
  this.resetPasswordOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return otp;
};

// Generate reset token method
userSchema.methods.generateResetToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = token;
  this.resetPasswordTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  return token;
};

// Clear reset fields method
userSchema.methods.clearResetFields = function() {
  this.resetPasswordOtp = null;
  this.resetPasswordOtpExpiry = null;
  this.resetPasswordToken = null;
  this.resetPasswordTokenExpiry = null;
};

userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.resetPasswordOtp;
  delete user.resetPasswordOtpExpiry;
  delete user.resetPasswordToken;
  delete user.resetPasswordTokenExpiry;
  return user;
};

// Package validity check method
userSchema.methods.hasValidPackage = function(userType = 'buyer') {
  if (!this.packages[userType] || this.packages[userType] === 'none') {
    return false;
  }
  
  if (this.packageExpiry && this.packageExpiry > new Date()) {
    return true;
  }
  
  return false;
};

export default mongoose.model('User', userSchema);