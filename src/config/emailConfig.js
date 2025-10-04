// utils/emailService.js
import nodemailer from 'nodemailer';

// Main OTP email function
export const sendOtpEmail = async (email, otp) => {
  try {
    console.log('📧 Attempting to send OTP email to:', email);
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('❌ Email credentials missing');
      return false;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.verify();
    console.log('✅ Email server connection verified');

    const mailOptions = {
      from: `"Plot Listing" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset OTP - Plot Listing',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Plot Listing</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Password Reset OTP</p>
          </div>
          
          <div style="padding: 30px 20px;">
            <h2 style="color: #333; text-align: center;">Your Verification Code</h2>
            <p style="color: #666; text-align: center;">
              Use the following OTP to reset your password. This code is valid for 10 minutes.
            </p>
            
            <div style="text-align: center; margin: 40px 0;">
              <div style="display: inline-block; background: #f8f9fa; padding: 20px 40px; border: 2px dashed #667eea; border-radius: 10px;">
                <div style="font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px;">
                  ${otp}
                </div>
              </div>
            </div>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #856404;">
                <strong>Note:</strong> If you didn't request this OTP, please ignore this email.
              </p>
            </div>
          </div>
          
          <div style="text-align: center; padding: 20px; background: #f8f9fa;">
            <p style="margin: 0; color: #6c757d; font-size: 12px;">
              &copy; 2024 Plot Listing. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ OTP Email sent successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    return false;
  }
};

// Simple version (backup)
export const sendOtpEmailSimple = async (email, otp) => {
  try {
    console.log('📧 Sending simple OTP email to:', email);
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset OTP - Plot Listing',
      text: `Your OTP code is: ${otp}. This code will expire in 10 minutes.`,
      html: `
        <div>
          <h2>Password Reset OTP</h2>
          <p>Your OTP code is: <strong style="font-size: 24px; color: #2563eb;">${otp}</strong></p>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Simple OTP email sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Simple email error:', error);
    return false;
  }
};