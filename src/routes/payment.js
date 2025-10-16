import express from 'express';
import { verifyToken as authMiddleware } from "../Middlewares/auth.js";
import { 
  createOrder, 
  verifyPayment, 
  getPaymentHistory
} from '../controllers/paymentController.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Create Razorpay order
router.post('/create-order', createOrder);

// Verify payment and activate package
router.post('/verify-payment', verifyPayment);

// Get payment history for user
router.get('/payment-history', getPaymentHistory);

export default router;