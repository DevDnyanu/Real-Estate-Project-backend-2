import User from '../models/user.js';
import jwt from 'jsonwebtoken';
import { signupValidation, loginValidation } from '../Middlewares/authValidation.js';
import { sendOtpEmail, sendOtpEmailSimple } from '../config/emailConfig.js';
import crypto from 'crypto';

const generateToken = (userId, name, email, role) => {
  return jwt.sign(
    { userId, name, email, role }, 
    process.env.JWT_SECRET || 'your-secret-key', 
    { expiresIn: '7d' }
  );
};

// Background email sending function with retry logic
const sendEmailInBackground = async (email, otp) => {
  try {
    console.log('🔄 Starting background email sending for:', email);
    
    let emailSent = false;
    let attempts = 0;
    const maxAttempts = 2;

    // Try primary email service first
    while (attempts < maxAttempts && !emailSent) {
      attempts++;
      try {
        if (attempts === 1) {
          emailSent = await sendOtpEmail(email, otp);
        } else {
          emailSent = await sendOtpEmailSimple(email, otp);
        }
        
        if (emailSent) {
          console.log('✅ Background email sent successfully to:', email);
          break;
        }
      } catch (emailError) {
        console.error(`❌ Email attempt ${attempts} failed:`, emailError.message);
        if (attempts < maxAttempts) {
          console.log('🔄 Retrying with alternative method...');
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
      }
    }

    if (!emailSent) {
      console.error('❌ All email attempts failed for:', email);
    }
    
  } catch (error) {
    console.error('❌ Background email process failed:', error.message);
  }
};

export const signup = async (req, res) => {
  try {
    const { error } = signupValidation(req.body);
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path[0],
        message: detail.message
      }));
      
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors
      });
    }

    const { name, email, phone, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User already exists with this email'
      });
    }

    const user = new User({
      name,
      email,
      phone,
      password,
      role: role || 'buyer',
      availableRoles: ['buyer', 'seller']
    });

    await user.save();

    const token = generateToken(user._id, user.name, user.email, user.role);

    res.status(201).json({
      status: 'success',
      message: 'User created successfully',
      token,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          availableRoles: user.availableRoles,
          canSwitchRole: true,
          image: user.profilePicture
        }
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Internal server error'
    });
  }
};

export const login = async (req, res) => {
  try {
    const { error } = loginValidation(req.body);
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path[0],
        message: detail.message
      }));
      
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors
      });
    }

    const { email, password, role } = req.body;

    console.log('Login attempt:', { email, requestedRole: role });

    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      console.log('Invalid password for:', email);
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    const selectedRole = role || user.role;

    if (!user.canUseRole(selectedRole)) {
      return res.status(403).json({
        status: 'error',
        message: `You don't have permission to login as ${selectedRole}`
      });
    }

    const token = generateToken(user._id, user.name, user.email, selectedRole);

    res.json({
      status: 'success',
      message: `Logged in successfully as ${selectedRole}`,
      token,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: selectedRole,
          originalRole: user.role,
          availableRoles: user.availableRoles,
          canSwitchRole: true,
          image: user.profilePicture
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Internal server error'
    });
  }
};

export const verifyToken = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Token is not valid'
      });
    }

    res.json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          availableRoles: user.availableRoles,
          currentRole: decoded.role || 'buyer',
          image: user.profilePicture
        },
        isValid: true
      }
    });
  } catch (error) {
    res.status(401).json({
      status: 'error',
      message: 'Token is not valid'
    });
  }
};

// Get user profile
export const getProfile = async (req, res) => {
  try {
    console.log('Get profile request - User ID:', req.user.userId);
    
    const user = await User.findById(req.user.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: req.user.role,
          image: user.profilePicture,
          originalRole: user.role,
          availableRoles: user.availableRoles
        }
      }
    });
    
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user profile'
    });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    console.log('Update profile request:', { name, email, phone });

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          image: user.profilePicture,
          availableRoles: user.availableRoles
        }
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update profile'
    });
  }
};

// Upload profile image - BASE64 VERSION (NO FILE UPLOAD)
export const uploadProfileImage = async (req, res) => {
  try {
    console.log('Upload profile image request received');
    
    const { imageBase64 } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({
        status: 'error',
        message: 'No image data provided'
      });
    }

    console.log('Base64 image data received, length:', imageBase64.length);

    // Directly store base64 in database
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { profilePicture: imageBase64 },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    console.log('Profile image updated successfully in database (Base64)');

    res.json({
      status: 'success',
      message: 'Profile image uploaded successfully',
      data: {
        imageUrl: imageBase64,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          image: user.profilePicture
        }
      }
    });
  } catch (error) {
    console.error('Upload profile image error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload profile image: ' + error.message
    });
  }
};

// Remove profile image
export const removeProfileImage = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Reset to empty string
    user.profilePicture = "";
    await user.save();

    res.json({
      status: 'success',
      message: 'Profile image removed successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          image: user.profilePicture
        }
      }
    });
  } catch (error) {
    console.error('Remove profile image error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to remove profile image'
    });
  }
};

// Enhanced Forgot Password with immediate response and better email handling
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is required'
      });
    }

    console.log('🔐 Forgot password request for:', email);

    const user = await User.findOne({ email });
    
    // Security: Always return success to prevent email enumeration
    const successResponse = {
      status: 'success',
      message: 'If the email exists, a password reset OTP has been sent to your email',
      data: {
        email: email
      }
    };

    if (!user) {
      console.log('❌ User not found for email:', email);
      // Still return success for security
      return res.json(successResponse);
    }

    // Generate OTP
    const otp = user.generateResetOtp();
    await user.save();

    console.log('🔐 Generated OTP for', email, ':', otp);

    // Add to response for development
    if (process.env.NODE_ENV === 'development') {
      successResponse.data.otp = otp;
      console.log('🔐 Development OTP (for testing):', otp);
    }

    // ✅ CRITICAL: Send email in background without blocking response
    sendEmailInBackground(email, otp).catch(error => {
      console.error('❌ Background email failed:', error);
    });

    // Return immediate response - don't wait for email
    return res.json(successResponse);

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    
    // Still return success for security even if there's an error
    res.json({
      status: 'success',
      message: 'If the email exists, a password reset OTP has been sent to your email',
      data: {
        email: req.body.email
      }
    });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and OTP are required'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    if (!user.resetPasswordOtp || !user.resetPasswordOtpExpiry) {
      return res.status(400).json({
        status: 'error',
        message: 'No OTP found or OTP expired. Please request a new one.'
      });
    }

    if (user.resetPasswordOtpExpiry < new Date()) {
      user.clearResetFields();
      await user.save();
      return res.status(400).json({
        status: 'error',
        message: 'OTP has expired. Please request a new one.'
      });
    }

    if (user.resetPasswordOtp !== otp) {
      // Track failed attempts for security
      user.resetPasswordAttempts = (user.resetPasswordAttempts || 0) + 1;
      await user.save();

      if (user.resetPasswordAttempts >= 5) {
        user.clearResetFields();
        await user.save();
        return res.status(400).json({
          status: 'error',
          message: 'Too many failed attempts. Please request a new OTP.'
        });
      }

      return res.status(400).json({
        status: 'error',
        message: 'Invalid OTP'
      });
    }

    // Reset failed attempts on successful verification
    user.resetPasswordAttempts = 0;
    const resetToken = user.generateResetToken();
    user.resetPasswordOtp = null;
    user.resetPasswordOtpExpiry = null;
    await user.save();

    res.json({
      status: 'success',
      message: 'OTP verified successfully',
      data: {
        resetToken,
        expiresIn: '15 minutes'
      }
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error: ' + error.message
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Email, reset token, and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 6 characters long'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    if (!user.resetPasswordToken || !user.resetPasswordTokenExpiry) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired reset token'
      });
    }

    if (user.resetPasswordTokenExpiry < new Date()) {
      user.clearResetFields();
      await user.save();
      return res.status(400).json({
        status: 'error',
        message: 'Reset token has expired'
      });
    }

    if (user.resetPasswordToken !== resetToken) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid reset token'
      });
    }

    user.password = newPassword;
    user.clearResetFields();
    await user.save();

    res.json({
      status: 'success',
      message: 'Password reset successfully. You can now login with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

/** Switch User Role */
export const switchRole = async (req, res) => {
  try {
    const { newRole } = req.body;
    const user = req.user;

    console.log(`🔄 Role switch request: ${user.role} → ${newRole} for user: ${user.userId}`);

    // Validate role
    if (!['buyer', 'seller'].includes(newRole)) {
      return res.status(400).json({
        status: 'error',
        message: "Invalid role. Role must be 'buyer' or 'seller'"
      });
    }

    // Check if user exists in database
    const userData = await User.findById(user.userId);
    if (!userData) {
      return res.status(404).json({
        status: 'error',
        message: "User not found"
      });
    }

    // Check if user can use this role
    if (!userData.canUseRole(newRole)) {
      return res.status(403).json({
        status: 'error',
        message: `You don't have permission to switch to ${newRole} role`
      });
    }

    // Generate new token with updated role
    const newToken = jwt.sign(
      {
        userId: user.userId,
        role: newRole, // ✅ NEW ROLE IN TOKEN
        name: userData.name,
        email: userData.email
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    console.log(`✅ Role switched successfully: ${user.role} → ${newRole}`);

    res.json({
      status: 'success',
      message: `Role switched to ${newRole} successfully`,
      token: newToken,
      data: {
        user: {
          id: userData._id,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          role: newRole, // ✅ UPDATED ROLE
          originalRole: userData.role,
          availableRoles: userData.availableRoles,
          canSwitchRole: true,
          image: userData.profilePicture
        }
      }
    });

  } catch (error) {
    console.error("Role switch error:", error);
    res.status(500).json({
      status: 'error',
      message: "Failed to switch role: " + error.message
    });
  }
};
