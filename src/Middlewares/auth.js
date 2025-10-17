// Middlewares/auth.js
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

    // ✅ Use header role if provided, otherwise use token role
    const effectiveRole = headerRole || decoded.role;

    req.user = {
      userId: decoded.userId,
      role: effectiveRole, // ✅ Effective role for this request
      name: decoded.name,
      email: decoded.email,
      tokenRole: decoded.role, // Original token role
      headerRole: headerRole // Header role from frontend
    };

    next();
  } catch (error) {
    console.error('❌ Invalid token:', error.message);
    req.user = null;
    next();
  }
};