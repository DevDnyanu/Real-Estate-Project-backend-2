import express from 'express';
import auth from '../Middlewares/auth.js';
import {
  getUserPackage,
  activateFreePackage,
  updatePackageUsage,
  getPackageHistory,
  canPerformAction,
  getAvailablePackages
} from '../controllers/packageController.js';

import { 
  createOrder, 
  verifyPayment 
} from '../controllers/paymentController.js';

const router = express.Router();

router.get('/user-package', auth, getUserPackage);
router.post('/activate-free', auth, activateFreePackage);
router.post('/update-usage', auth, updatePackageUsage);  // ✅ rename here
router.get('/history', auth, getPackageHistory);
router.get('/can-perform', auth, canPerformAction);
router.get('/available', auth, getAvailablePackages);

router.post('/create-order', auth, createOrder);
router.post('/verify-payment', auth, verifyPayment);

export default router;
