import dotenv from "dotenv";
dotenv.config();

import crypto from "crypto";
import Razorpay from "razorpay";
import UserPackage from "../models/package.js";
import Payment from "../models/payment.js";

const PACKAGE_CONFIG = {
  silver: { price: 499, duration: 30, limit: 30 },
  gold: { price: 999, duration: 90, limit: 50 },
  premium: { price: 1999, duration: 365, limit: 100 }
};

// Razorpay initialization
let razorpay;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

export const createOrder = async (req, res) => {
  try {
    const { packageType, userType = "buyer" } = req.body;

    if (!packageType) {
      return res.status(400).json({
        success: false,
        message: "Package type is required",
      });
    }

    const validPackageTypes = Object.keys(PACKAGE_CONFIG);
    if (!validPackageTypes.includes(packageType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid package type: ${packageType}`,
      });
    }

    if (!razorpay) {
      return res.status(500).json({
        success: false,
        message: "Payment gateway not configured",
      });
    }

    const amount = PACKAGE_CONFIG[packageType].price;
    
    // ✅ FIX: Shorter receipt (max 40 characters)
    const receipt = `rcpt_${Date.now().toString().slice(-8)}_${packageType.slice(0,3)}`;
    
    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: receipt, // ✅ Now it's only ~20 characters
      payment_capture: 1,
    };

    console.log("Creating Razorpay order with:", options);

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
      },
      packageDetails: {
        packageType,
        userType,
        amount,
        duration: PACKAGE_CONFIG[packageType].duration,
        propertyLimit: PACKAGE_CONFIG[packageType].limit,
      },
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Order creation error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Server error while creating order",
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      packageType,
      userType = "buyer",
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !packageType) {
      return res.status(400).json({
        success: false,
        message: "Missing required payment data",
      });
    }

    const validPackageTypes = Object.keys(PACKAGE_CONFIG);
    if (!validPackageTypes.includes(packageType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid package type: ${packageType}`,
      });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    const existingPayment = await Payment.findOne({
      razorpayPaymentId: razorpay_payment_id,
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: "Payment already processed",
      });
    }

    await UserPackage.updateMany(
      { 
        userId: req.user.userId, 
        userType: userType,
        isActive: true 
      },
      { 
        isActive: false, 
        status: "replaced" 
      }
    );

    const purchaseDate = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + PACKAGE_CONFIG[packageType].duration);

    const newUserPackage = new UserPackage({
      userId: req.user.userId,
      packageType,
      userType,
      amount: PACKAGE_CONFIG[packageType].price,
      propertyLimit: PACKAGE_CONFIG[packageType].limit,
      propertiesUsed: 0,
      purchaseDate,
      expiryDate,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      status: "completed",
      isActive: true,
    });

    await newUserPackage.save();

    const payment = new Payment({
      userId: req.user.userId,
      packageType,
      userType,
      amount: PACKAGE_CONFIG[packageType].price,
      currency: "INR",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      status: "completed",
      paymentDate: new Date(),
    });

    await payment.save();

    const daysRemaining = Math.ceil((expiryDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));

    res.json({
      success: true,
      message: "Payment verified! Package activated.",
      package: {
        _id: newUserPackage._id,
        packageType: newUserPackage.packageType,
        userType: newUserPackage.userType,
        purchaseDate: newUserPackage.purchaseDate,
        expiryDate: newUserPackage.expiryDate,
        propertyLimit: newUserPackage.propertyLimit,
        propertiesUsed: newUserPackage.propertiesUsed,
        isActive: true,
        daysRemaining,
        amount: newUserPackage.amount,
        remaining: newUserPackage.propertyLimit,
      },
      payment: {
        id: payment._id,
        amount: payment.amount,
        status: payment.status,
        paymentDate: payment.paymentDate
      }
    });
  } catch (err) {
    console.error("Payment verification error:", err);
    res.status(500).json({
      success: false,
      message: "Server error during payment verification",
    });
  }
};

export const getPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .select("-razorpaySignature")
      .lean();

    const paymentHistory = payments.map((p) => ({
      id: p._id,
      packageType: p.packageType,
      userType: p.userType,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      paymentDate: p.paymentDate,
      razorpayOrderId: p.razorpayOrderId,
      razorpayPaymentId: p.razorpayPaymentId,
      createdAt: p.createdAt,
    }));

    res.json({
      success: true,
      payments: paymentHistory,
      total: payments.length,
    });
  } catch (err) {
    console.error("Payment history error:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching payment history",
    });
  }
};

export default {
  createOrder,
  verifyPayment,
  getPaymentHistory,
};