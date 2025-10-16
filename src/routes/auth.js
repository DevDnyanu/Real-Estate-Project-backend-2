// routes/auth.js - CORRECTED VERSION
import express from 'express';
import { 
  signup, 
  login, 
  verifyToken, 
  forgotPassword, 
  verifyOtp, 
  resetPassword,
  getProfile,
  updateProfile,
  uploadProfileImage,
  removeProfileImage,
  switchRole
} from '../controllers/authController.js';
import { verifyToken as authMiddleware } from '../Middlewares/auth.js'; // ✅ CORRECT IMPORT

const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/verify', verifyToken); // ✅ This is from authController
router.get('/profile', authMiddleware, getProfile); // ✅ This is from auth middleware
router.put('/profile', authMiddleware, updateProfile);
router.post('/profile/upload-image', authMiddleware, uploadProfileImage);
router.delete('/profile/remove-image', authMiddleware, removeProfileImage);

// Role switch route
router.post('/switch-role', authMiddleware, switchRole);

export default router;