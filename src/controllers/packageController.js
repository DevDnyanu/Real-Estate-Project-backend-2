// src/controllers/packageController.js
import UserPackage from '../models/package.js';

// Package configuration
const PACKAGE_CONFIG = {
  free: { limit: 5, duration: 15, price: 0 },
  silver: { limit: 30, duration: 30, price: 499 },
  gold: { limit: 50, duration: 90, price: 999 },
  premium: { limit: 100, duration: 365, price: 1999 }
};

/**
 * Get user's current active package
 */
export const getUserPackage = async (req, res) => {
  try {
    console.log('Fetching package for user:', req.user.userId);
    
    const userPackage = await UserPackage.getActivePackage(req.user.userId);

    if (!userPackage) {
      console.log('No active package found for user:', req.user.userId);
      return res.json({ 
        success: true, 
        package: null,
        message: 'No active package found'
      });
    }

    const now = new Date();
    const expiryDate = new Date(userPackage.expiryDate);
    const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const packageData = {
      _id: userPackage._id,
      packageType: userPackage.packageType,
      userType: userPackage.userType,
      purchaseDate: userPackage.purchaseDate,
      expiryDate: userPackage.expiryDate,
      propertyLimit: userPackage.propertyLimit,
      propertiesUsed: userPackage.propertiesUsed,
      isActive: userPackage.isValid(),
      daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
      amount: userPackage.amount,
      remaining: userPackage.propertyLimit - userPackage.propertiesUsed
    };

    console.log('Package found:', packageData);

    res.json({
      success: true,
      package: packageData
    });
  } catch (error) {
    console.error('Error fetching package:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching package details'
    });
  }
};

/**
 * Activate free package
 */
export const activateFreePackage = async (req, res) => {
  try {
    const { packageType = 'free', userType = 'buyer' } = req.body;

    console.log('Activating free package:', { 
      packageType, 
      userType, 
      userId: req.user.userId 
    });

    // Validate package type
    if (!PACKAGE_CONFIG[packageType]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid package type'
      });
    }

    // Check if package is actually free
    if (packageType !== 'free' && PACKAGE_CONFIG[packageType].price > 0) {
      return res.status(400).json({
        success: false,
        message: 'This package requires payment'
      });
    }

    // Deactivate any existing packages
    await UserPackage.updateMany(
      { userId: req.user.userId, isActive: true },
      { isActive: false, status: 'expired' }
    );

    const purchaseDate = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + PACKAGE_CONFIG[packageType].duration);

    // Create new package entry in database
    const newUserPackage = new UserPackage({
      userId: req.user.userId,
      packageType,
      userType,
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

    console.log('Free package activated successfully. Database entry created:', {
      packageId: newUserPackage._id,
      userId: newUserPackage.userId,
      packageType: newUserPackage.packageType
    });

    res.json({
      success: true,
      package: {
        _id: newUserPackage._id,
        packageType: newUserPackage.packageType,
        userType: newUserPackage.userType,
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
    console.error('Error activating free package:', error);
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

    console.log('Updating package usage:', { action, userId: req.user.userId });

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

    console.log('Package usage updated:', userPackage.propertiesUsed);

    res.json({
      success: true,
      propertiesUsed: userPackage.propertiesUsed,
      propertyLimit: userPackage.propertyLimit,
      remaining: userPackage.propertyLimit - userPackage.propertiesUsed,
      message: `Usage ${action === 'increment' ? 'incremented' : 'decremented'} successfully`
    });
  } catch (error) {
    console.error('Error updating usage:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating package usage'
    });
  }
};

/**
 * Get package history for user
 */
export const getPackageHistory = async (req, res) => {
  try {
    const packages = await UserPackage.find({ userId: req.user.userId })
      .sort({ createdAt: -1 });

    const formattedPackages = packages.map(pkg => {
      const now = new Date();
      const expiryDate = new Date(pkg.expiryDate);
      const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        id: pkg._id,
        packageType: pkg.packageType,
        userType: pkg.userType,
        amount: pkg.amount,
        propertyLimit: pkg.propertyLimit,
        propertiesUsed: pkg.propertiesUsed,
        purchaseDate: pkg.purchaseDate,
        expiryDate: pkg.expiryDate,
        status: pkg.status,
        isActive: pkg.isActive,
        isValid: pkg.isValid(),
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
        remaining: pkg.propertyLimit - pkg.propertiesUsed
      };
    });

    res.json({
      success: true,
      packages: formattedPackages,
      total: formattedPackages.length
    });
  } catch (error) {
    console.error('Error fetching package history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching package history'
    });
  }
};

/**
 * Check if user can perform action (view/create property)
 */
export const canPerformAction = async (req, res) => {
  try {
    const { actionType = 'view' } = req.query;
    
    const userPackage = await UserPackage.getActivePackage(req.user.userId);
    
    if (!userPackage) {
      return res.json({
        success: true,
        canPerform: false,
        reason: 'no_package',
        message: 'No active package found. Please purchase a package.',
        action: actionType
      });
    }

    if (!userPackage.isValid()) {
      return res.json({
        success: true,
        canPerform: false,
        reason: 'package_invalid',
        message: 'Your package has expired or reached its limit.',
        action: actionType
      });
    }

    const canPerform = userPackage.propertiesUsed < userPackage.propertyLimit;
    const remaining = userPackage.propertyLimit - userPackage.propertiesUsed;

    res.json({
      success: true,
      canPerform,
      remaining,
      packageType: userPackage.packageType,
      propertiesUsed: userPackage.propertiesUsed,
      propertyLimit: userPackage.propertyLimit,
      reason: canPerform ? null : 'limit_reached',
      message: canPerform ? `You can perform this action. ${remaining} remaining.` : 'Action limit reached.',
      action: actionType
    });
  } catch (error) {
    console.error('Error checking action permission:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking action permission'
    });
  }
};

/**
 * Get all available packages with details
 */
export const getAvailablePackages = async (req, res) => {
  try {
    const { userType = 'buyer' } = req.query;
    
    const packages = Object.keys(PACKAGE_CONFIG).map(packageType => {
      const config = PACKAGE_CONFIG[packageType];
      return {
        packageType,
        userType,
        propertyLimit: config.limit,
        duration: config.duration,
        price: config.price,
        isFree: config.price === 0,
        features: getPackageFeatures(packageType, userType)
      };
    });

    res.json({
      success: true,
      packages,
      userType
    });
  } catch (error) {
    console.error('Error fetching available packages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available packages'
    });
  }
};

/**
 * Helper function to get package features
 */
const getPackageFeatures = (packageType, userType) => {
  const baseFeatures = {
    free: [
      userType === 'seller' ? 'List up to 5 properties' : 'View up to 5 properties',
      'Basic property details',
      'Email notifications',
      `${userType === 'seller' ? '15-day' : '15-day'} validity`
    ],
    silver: [
      userType === 'seller' ? 'List up to 30 properties' : 'View up to 30 properties',
      'Full property details',
      'Contact information access',
      `${userType === 'seller' ? '30-day' : '30-day'} validity`
    ],
    gold: [
      userType === 'seller' ? 'List up to 50 properties' : 'View up to 50 properties',
      'Priority customer support',
      'Advanced search filters',
      `${userType === 'seller' ? '90-day' : '90-day'} validity`
    ],
    premium: [
      userType === 'seller' ? 'List up to 100 properties' : 'View up to 100 properties',
      '24/7 dedicated support',
      'Price drop alerts',
      `${userType === 'seller' ? '365-day' : '365-day'} validity`
    ]
  };

  return baseFeatures[packageType] || baseFeatures.free;
};

export default {
  getUserPackage,
  activateFreePackage,
  updatePackageUsage,
  getPackageHistory,
  canPerformAction,
  getAvailablePackages
};