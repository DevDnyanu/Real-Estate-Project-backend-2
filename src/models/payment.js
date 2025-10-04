import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    packageType: { 
      type: String, 
      enum: ["silver", "gold", "premium"], 
      required: true 
    },
    userType: {
      type: String,
      enum: ["buyer", "seller"],
      required: true
    },
    amount: { 
      type: Number, 
      required: true 
    },
    currency: {
      type: String,
      default: "INR"
    },
    razorpayOrderId: { 
      type: String,
      required: true
    },
    razorpayPaymentId: { 
      type: String,
      required: true
    },
    razorpaySignature: { 
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
    paymentDate: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

paymentSchema.index({ userId: 1 });
paymentSchema.index({ razorpayPaymentId: 1 });
paymentSchema.index({ createdAt: -1 });

export default mongoose.model("Payment", paymentSchema);