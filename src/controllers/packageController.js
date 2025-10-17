// controllers/packageController.js - UPDATED
import UserPackage from '../models/package.js';

const PACKAGE_CONFIG = {
  free: { limit: 5, duration: 15, price: 0 },
  silver: { limit: 30, duration: 30, price: 499 },
  gold: { limit: 50, duration: 90, price: 999 },
  premium: { limit: 100, duration: 365, price: 1999 }
};

/**
 * Get user's current active package - FIXED: Role-agnostic
 */
export const getUserPackage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const currentRole = req.user.role;

    console.log('🔍 Fetching package for user:', { 
      userId, 
      currentRole 
    });

    // ✅ FIXED: Package is now role-agnostic
    const userPackage = await UserPackage.findOne({
      userId: userId,
      isActive: true,
      expiryDate: { $gt: new Date() },
      status: "completed"
    }).sort({ createdAt: -1 });

    if (!userPackage) {
      console.log('❌ No active package found for user:', userId);
      return res.json({
        success: true,
        package: null,
        message: 'No active package found'
      });
    }

    const now = new Date();
    const expiryDate = new Date(userPackage.expiryDate);
    const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isValid = userPackage.isValid();
    const remaining = userPackage.getRemaining();

    const packageData = {
      _id: userPackage._id,
      packageType: userPackage.packageType,
      // ✅ REMOVED: userType field
      purchaseDate: userPackage.purchaseDate,
      expiryDate: userPackage.expiryDate,
      propertyLimit: userPackage.propertyLimit,
      propertiesUsed: userPackage.propertiesUsed,
      isActive: isValid,
      daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
      amount: userPackage.amount,
      remaining,
      currentRole: currentRole // For UI context only
    };

    console.log('✅ Package found:', {
      packageType: packageData.packageType,
      remaining: packageData.remaining,
      isValid: packageData.isActive,
      currentRole: currentRole
    });

    res.json({
      success: true,
      package: packageData
    });
  } catch (error) {
    console.error('❌ Error fetching package:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching package details'
    });
  }
};

/**
 * Activate free package - UPDATED
 */
export const activateFreePackage = async (req, res) => {
  try {
    const { packageType = 'free' } = req.body;

    console.log('🎯 Activating free package:', { 
      packageType, 
      userId: req.user.userId,
      currentRole: req.user.role 
    });

    if (!PACKAGE_CONFIG[packageType]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid package type'
      });
    }

    if (packageType !== 'free' && PACKAGE_CONFIG[packageType].price > 0) {
      return res.status(400).json({
        success: false,
        message: 'This package requires payment'
      });
    }

    // ✅ Deactivate any existing packages
    await UserPackage.updateMany(
      { userId: req.user.userId, isActive: true },
      { isActive: false, status: 'expired' }
    );

    const purchaseDate = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + PACKAGE_CONFIG[packageType].duration);

    // ✅ Create new package WITHOUT userType
    const newUserPackage = new UserPackage({
      userId: req.user.userId,
      packageType,
      amount: PACKAGE_CONFIG[packageType].price,
      propertyLimit: PACKAGE_CONFIG[packageType].limit,
      propertiesUsed: 0,
      purchaseDate,
      expiryDate,
      status: 'completed',
      isActive: true
    });

    await newUserPackage.save();

    const daysRemaining = Math.ceil((expiryDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));

    console.log('✅ Free package activated successfully:', {
      packageId: newUserPackage._id,
      userId: newUserPackage.userId,
      packageType: newUserPackage.packageType
    });

    res.json({
      success: true,
      package: {
        _id: newUserPackage._id,
        packageType: newUserPackage.packageType,
        purchaseDate: newUserPackage.purchaseDate,
        expiryDate: newUserPackage.expiryDate,
        propertyLimit: newUserPackage.propertyLimit,
        propertiesUsed: newUserPackage.propertiesUsed,
        isActive: true,
        daysRemaining,
        amount: newUserPackage.amount,
        remaining: newUserPackage.propertyLimit
      },
      message: `${packageType.charAt(0).toUpperCase() + packageType.slice(1)} package activated successfully`
    });
  } catch (error) {
    console.error('❌ Error activating free package:', error);
    res.status(500).json({
      success: false,
      message: 'Error activating package'
    });
  }
};


/**
 * Update package usage
 */
export const updatePackageUsage = async (req, res) => {
  try {
    const { action } = req.body;

    console.log('🔄 Updating package usage:', { 
      action, 
      userId: req.user.userId,
      currentRole: req.user.role 
    });

    if (!['increment', 'decrement'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "increment" or "decrement"'
      });
    }

    const userPackage = await UserPackage.getActivePackage(req.user.userId);

    if (!userPackage) {
      return res.status(400).json({
        success: false,
        message: 'No active package found'
      });
    }

    if (action === 'increment') {
      if (userPackage.propertiesUsed >= userPackage.propertyLimit) {
        return res.status(400).json({
          success: false,
          message: 'Property limit reached. Please upgrade your package.'
        });
      }
      userPackage.propertiesUsed += 1;
    } else {
      userPackage.propertiesUsed = Math.max(0, userPackage.propertiesUsed - 1);
    }

    await userPackage.save();

    console.log('✅ Package usage updated:', {
      propertiesUsed: userPackage.propertiesUsed,
      remaining: userPackage.getRemaining()
    });

    res.json({
      success: true,
      propertiesUsed: userPackage.propertiesUsed,
      propertyLimit: userPackage.propertyLimit,
      remaining: userPackage.getRemaining(),
      message: `Usage ${action === 'increment' ? 'incremented' : 'decremented'} successfully`
    });
  } catch (error) {
    console.error('❌ Error updating usage:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating package usage'
    });
  }
};

/**
 * Get package history
 */
export const getPackageHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    console.log('📜 Fetching package history for user:', req.user.userId);

    const packages = await UserPackage.find({ userId: req.user.userId })
      .sort({ purchaseDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await UserPackage.countDocuments({ userId: req.user.userId });

    const history = packages.map(pkg => {
      const expiryDate = new Date(pkg.expiryDate);
      const now = new Date();
      const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        _id: pkg._id,
        packageType: pkg.packageType,
        userType: pkg.userType,
        purchaseDate: pkg.purchaseDate,
        expiryDate: pkg.expiryDate,
        amount: pkg.amount,
        status: pkg.status,
        isActive: pkg.isActive,
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
        propertyLimit: pkg.propertyLimit,
        propertiesUsed: pkg.propertiesUsed
      };
    });

    res.json({
      success: true,
      history,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('❌ Error fetching package history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching package history'
    });
  }
};

/**
 * Check if user can perform action (property upload)
 */
export const canPerformAction = async (req, res) => {
  try {
    console.log('🔍 Checking if user can perform action:', req.user.userId);

    const userPackage = await UserPackage.getActivePackage(req.user.userId);

    if (!userPackage) {
      return res.json({
        success: true,
        canPerform: false,
        message: 'No active package found'
      });
    }

    const canPerform = userPackage.getRemaining() > 0 && userPackage.isValid();

    res.json({
      success: true,
      canPerform,
      remaining: userPackage.getRemaining(),
      limit: userPackage.propertyLimit,
      used: userPackage.propertiesUsed,
      packageType: userPackage.packageType
    });
  } catch (error) {
    console.error('❌ Error checking action permission:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking action permission'
    });
  }
};

/**
 * Get available packages
 */
export const getAvailablePackages = async (req, res) => {
  try {
    console.log('📦 Fetching available packages for user:', req.user.userId);

    const packages = Object.entries(PACKAGE_CONFIG).map(([type, config]) => ({
      packageType: type,
      name: type.charAt(0).toUpperCase() + type.slice(1),
      propertyLimit: config.limit,
      duration: config.duration,
      price: config.price,
      isFree: config.price === 0,
      features: [
        `${config.limit} properties`,
        `${config.duration} days validity`,
        config.price === 0 ? 'Free forever' : `₹${config.price}`
      ]
    }));

    res.json({
      success: true,
      packages
    });
  } catch (error) {
    console.error('❌ Error fetching available packages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available packages'
    });
  }
};

export default {
  getUserPackage,
  activateFreePackage,
  updatePackageUsage,
  getPackageHistory,
  canPerformAction,
  getAvailablePackages
};