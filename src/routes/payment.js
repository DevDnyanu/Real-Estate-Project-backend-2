import express from 'express';
import auth from '../Middlewares/auth.js';
import { 
  createOrder, 
  verifyPayment, 
  getPaymentHistory
} from '../controllers/paymentController.js';

const router = express.Router();

// Create Razorpay order
router.post('/create-order', auth, createOrder);

// Verify payment and activate package
router.post('/verify-payment', auth, verifyPayment);

// Get payment history for user
router.get('/payment-history', auth, getPaymentHistory);



export default router;