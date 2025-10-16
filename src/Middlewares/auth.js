// Middlewares/auth.js - FINAL VERSION (Named Exports)
import jwt from 'jsonwebtoken';

export const verifyToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      console.log('🔓 No token provided - allowing unauthenticated access');
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    const headerRole = req.headers['x-current-role'];
    
    console.log('✅ Token verified - User:', {
      userId: decoded.userId,
      tokenRole: decoded.role,
      headerRole: headerRole,
      name: decoded.name
    });

    if (headerRole && headerRole !== decoded.role) {
      console.warn('⚠️ Role mismatch detected:', {
        tokenRole: decoded.role,
        headerRole: headerRole,
        userId: decoded.userId
      });
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      name: decoded.name,
      email: decoded.email
    };

    next();
  } catch (error) {
    console.error('❌ Invalid token:', error.message);
    req.user = null;
    next();
  }
};