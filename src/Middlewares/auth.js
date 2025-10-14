
import jwt from 'jsonwebtoken';

const authenticateToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      console.log('🔓 No token provided - allowing unauthenticated access');
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      name: decoded.name,
      email: decoded.email
    };

    console.log('✅ Token verified - User:', req.user.userId, 'Role:', req.user.role);
    next();
  } catch (error) {
    console.error('❌ Invalid token:', error.message);
    req.user = null;
    next();
  }
};

// Export as default export
export default authenticateToken;