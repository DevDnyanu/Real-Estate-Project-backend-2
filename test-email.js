// Email Testing Script
// Run this to verify your email configuration
// Usage: node test-email.js

import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

console.log('\n🧪 Testing Email Configuration...\n');
console.log('📧 Email User:', process.env.EMAIL_USER);
console.log('🔑 Password Length:', process.env.EMAIL_PASSWORD?.length, 'characters');
console.log('📬 Admin Email:', process.env.ADMIN_EMAIL);
console.log('\n');

async function testEmail() {
  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    console.log('🔄 Verifying email server connection...');

    // Verify connection
    await transporter.verify();
    console.log('✅ Email server connection successful!\n');

    // Send test email
    console.log('📧 Sending test email...');

    const testMailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: '🧪 PlotChamp Email Test - Successful!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px;
            }
            .content {
              background: white;
              padding: 30px;
              margin-top: 20px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .success {
              background: #d4edda;
              border: 1px solid #c3e6cb;
              color: #155724;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
            }
            .info-box {
              background: #e8f4fd;
              padding: 15px;
              border-radius: 5px;
              margin: 15px 0;
              border-left: 4px solid #667eea;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Email Configuration Test</h1>
              <p>PlotChamp Real Estate</p>
            </div>
            <div class="content">
              <div class="success">
                <strong>✅ Success!</strong> Your email configuration is working perfectly!
              </div>

              <h2>Test Details:</h2>
              <div class="info-box">
                <p><strong>📧 From:</strong> ${process.env.EMAIL_USER}</p>
                <p><strong>📬 To:</strong> ${process.env.ADMIN_EMAIL}</p>
                <p><strong>⏰ Time:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                <p><strong>🔧 Server:</strong> smtp.gmail.com</p>
                <p><strong>🔒 Port:</strong> 587 (TLS)</p>
              </div>

              <h2>What This Means:</h2>
              <ul>
                <li>✅ Gmail App Password is configured correctly</li>
                <li>✅ SMTP connection is working</li>
                <li>✅ Emails will be delivered successfully</li>
                <li>✅ Contact form is ready for production</li>
              </ul>

              <h2>Next Steps:</h2>
              <ol>
                <li>Start your server: <code>npm start</code></li>
                <li>Test the contact form on your website</li>
                <li>Monitor server logs for email delivery</li>
              </ol>

              <div class="info-box">
                <strong>📝 Note:</strong> If you receive this email, your email system is production-ready!
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(testMailOptions);

    console.log('✅ Test email sent successfully!');
    console.log('📬 Message ID:', info.messageId);
    console.log('📧 Email sent to:', process.env.ADMIN_EMAIL);
    console.log('\n✅ Check your inbox (and spam folder) for the test email!\n');
    console.log('🎉 Email configuration is PRODUCTION READY!\n');

  } catch (error) {
    console.error('\n❌ Email Test Failed!\n');
    console.error('Error:', error.message);
    console.error('\nPossible Solutions:');
    console.error('1. Check if 2-Step Verification is enabled on Gmail');
    console.error('2. Generate a new App Password at: https://myaccount.google.com/apppasswords');
    console.error('3. Make sure password has NO SPACES (should be 16 characters)');
    console.error('4. Update .env file with correct credentials');
    console.error('5. Restart your server after changing .env\n');

    if (error.code === 'EAUTH') {
      console.error('⚠️  Authentication failed - Your credentials are incorrect');
      console.error('   Please check EMAIL_USER and EMAIL_PASSWORD in .env file\n');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('⚠️  Connection timeout - Check your internet connection');
      console.error('   Make sure port 587 is not blocked by firewall\n');
    }

    process.exit(1);
  }
}

testEmail();
