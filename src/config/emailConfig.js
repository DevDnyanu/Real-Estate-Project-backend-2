import nodemailer from 'nodemailer';

const getEmailConfig = () => {
  console.log('🔧 Environment in emailConfig:', {
    NODE_ENV: process.env.NODE_ENV,
    EMAIL_USER_EXISTS: !!process.env.EMAIL_USER,
    EMAIL_PASS_EXISTS: !!process.env.EMAIL_PASS,
    EMAIL_PASSWORD_EXISTS: !!process.env.EMAIL_PASSWORD, // ✅ Check this too
    ALL_KEYS: Object.keys(process.env).filter(key => key.includes('EMAIL'))
  });
  
  // ✅ Use EMAIL_PASSWORD if EMAIL_PASS doesn't exist
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD; // ✅ FIX HERE
  
  if (!user || !pass) {
    console.error('❌ Email credentials missing in environment variables');
    console.log('🔧 Available EMAIL env vars:', {
      EMAIL_USER: process.env.EMAIL_USER,
      EMAIL_PASS: process.env.EMAIL_PASS,
      EMAIL_PASSWORD: process.env.EMAIL_PASSWORD
    });
    throw new Error('EMAIL_USER or EMAIL_PASS not configured in environment');
  }
  
  return { user, pass };
};

export const sendOtpEmail = async (email, otp) => {
  try {
    console.log('📧 Attempting to send OTP email to:', email);
    
    const emailConfig = getEmailConfig();
    console.log('✅ Email config loaded successfully:', {
      user: emailConfig.user,
      pass: emailConfig.pass ? '***' + emailConfig.pass.slice(-4) : 'Not Set'
    });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailConfig.user,
        pass: emailConfig.pass,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100
    });

    // Verify connection
    await transporter.verify();
    console.log('✅ Email server connection verified');

    const mailOptions = {
      from: `"PlotChamps" <${emailConfig.user}>`,
      to: email,
      subject: 'Password Reset OTP - PlotChamps',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset OTP</h2>
          <p>Your OTP code is: <strong style="font-size: 24px; color: #2563eb;">${otp}</strong></p>
          <p>This code will expire in 10 minutes.</p>
        </div>
      `,
      text: `Your OTP code is: ${otp}. This code will expire in 10 minutes.`
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ OTP Email sent successfully! Message ID:', result.messageId);
    return true;
    
  } catch (error) {
    console.error('❌ Error sending OTP email:', error.message);
    throw error;
  }
};

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