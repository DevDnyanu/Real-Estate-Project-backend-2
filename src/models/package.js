// models/package.js - UPDATED
import mongoose from "mongoose";

const userPackageSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    packageType: { 
      type: String, 
      enum: ["free", "silver", "gold", "premium"], 
      required: true 
    },
    // ✅ REMOVED: userType field - package is now role-agnostic
    amount: { 
      type: Number, 
      required: true,
      default: 0
    },
    propertyLimit: {
      type: Number,
      required: true
    },
    propertiesUsed: {
      type: Number,
      default: 0
    },
    purchaseDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    expiryDate: {
      type: Date,
      required: true
    },
    razorpayOrderId: { 
      type: String 
    },
    razorpayPaymentId: { 
      type: String 
    },
    razorpaySignature: { 
      type: String 
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "expired", "replaced"],
      default: "pending",
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Indexes for better performance
userPackageSchema.index({ userId: 1, isActive: 1 });
userPackageSchema.index({ expiryDate: 1 });
userPackageSchema.index({ userId: 1, packageType: 1 });

// Static method to get active package - UPDATED
userPackageSchema.statics.getActivePackage = async function(userId) {
  const now = new Date();
  return this.findOne({ 
    userId, 
    isActive: true,
    expiryDate: { $gt: now },
    status: "completed"
  }).sort({ createdAt: -1 });
};

// Method to check if package is valid
userPackageSchema.methods.isValid = function() {
  const now = new Date();
  return this.isActive && 
         this.status === "completed" && 
         now <= this.expiryDate && 
         this.propertiesUsed < this.propertyLimit;
};

// Method to get remaining properties
userPackageSchema.methods.getRemaining = function() {
  return Math.max(0, this.propertyLimit - this.propertiesUsed);
};

export default mongoose.model("UserPackage", userPackageSchema);