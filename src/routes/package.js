import express from 'express';
import {
  getUserPackage,
  activateFreePackage,
  updatePackageUsage,
  getPackageHistory,
  canPerformAction,
  getAvailablePackages
} from '../controllers/packageController.js';
import { verifyToken as authMiddleware } from '../Middlewares/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Package information routes
router.get('/user-package', getUserPackage);
router.get('/available', getAvailablePackages);
router.get('/history', getPackageHistory);
router.get('/can-perform', canPerformAction);

// Package activation routes (only free)
router.post('/activate-free', activateFreePackage);

// Package usage management
router.post('/update-usage', updatePackageUsage);

export default router;