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
  removeProfileImage
} from '../controllers/authController.js';
import authMiddleware from '../Middlewares/auth.js';

const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/verify', verifyToken);
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);
router.post('/profile/upload-image', authMiddleware, uploadProfileImage); // No multer
router.delete('/profile/remove-image', authMiddleware, removeProfileImage);

export default router;