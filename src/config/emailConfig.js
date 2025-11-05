// emailConfig.js - COMPLETELY UPDATED VERSION
import nodemailer from 'nodemailer';

const getEmailConfig = () => {
  // ✅ REMOVE ALL SPACES from password
  const user = process.env.EMAIL_USER;
  let pass = (process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD || '').replace(/\s/g, '');
  
  console.log('🔧 Enhanced Environment Check:', {
    NODE_ENV: process.env.NODE_ENV,
    EMAIL_USER: user,
    EMAIL_PASS_LENGTH: pass.length,
    ALL_EMAIL_KEYS: Object.keys(process.env).filter(key => key.includes('EMAIL'))
  });
  
  if (!user || !pass) {
    console.error('❌ Email credentials MISSING:', {
      EMAIL_USER: user,
      EMAIL_PASS: pass ? '***' : 'Not Set'
    });
    throw new Error('EMAIL_USER or EMAIL_PASS not configured properly');
  }
  
  console.log('✅ Final Email Config:', {
    user: user,
    pass: '***' + pass.slice(-4),
    passLength: pass.length
  });
  
  return { user, pass };
};

export const sendOtpEmail = async (email, otp) => {
  try {
    console.log('📧 Sending OTP to:', email);
    
    const emailConfig = getEmailConfig();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailConfig.user,
        pass: emailConfig.pass,
      },
      // ✅ Better configuration
      pool: true,
      maxConnections: 3,
      secure: true,
      tls: {
        rejectUnauthorized: false
      }
    });

    console.log('🔐 Attempting SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP Connection Verified');

    const mailOptions = {
      from: `"PlotChamps" <${emailConfig.user}>`,
      to: email,
      subject: 'Password Reset OTP - PlotChamps',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset OTP</h2>
          <p>Your OTP code is: <strong style="font-size: 24px; color: #2563eb;">${otp}</strong></p>
          <p>This code will expire in 10 minutes.</p>
          <p><strong>Note:</strong> If you didn't request this, please ignore this email.</p>
        </div>
      `,
      text: `Your OTP code is: ${otp}. This code will expire in 10 minutes.`
    };

    console.log('📤 Sending email...');
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ OTP Email SENT! Message ID:', result.messageId);
    console.log('✅ Response:', result.response);
    
    return true;
    
  } catch (error) {
    console.error('❌ Email Error Details:', {
      message: error.message,
      code: error.code,
      command: error.command,
      stack: error.stack
    });
    throw error;
  }
};

// Keep the simple version as backup
export const sendOtpEmailSimple = async (email, otp) => {
  try {
    const emailConfig = getEmailConfig();
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailConfig.user,
        pass: emailConfig.pass,
      },
    });

    const mailOptions = {
      from: emailConfig.user,
      to: email,
      subject: 'Password Reset OTP - PlotChamps',
      text: `Your OTP code is: ${otp}. This code will expire in 10 minutes.`
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Simple OTP email sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Simple email error:', error.message);
    throw error;
  }
};