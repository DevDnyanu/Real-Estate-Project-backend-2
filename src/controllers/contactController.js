// src/controllers/contactController.js
import nodemailer from 'nodemailer';

export const sendContactEmail = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    console.log('📧 Contact form submission received:', { 
      name, 
      email, 
      phone: phone ? '***' + phone.slice(-3) : 'not provided',
      subject 
    });

    // Validation
    if (!name || !email || !phone || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Get email configuration
    const emailConfig = {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD
    };

    console.log('🔧 Email config check:', {
      user: emailConfig.user ? '✓ Set' : '✗ Missing',
      pass: emailConfig.pass ? '✓ Set (' + emailConfig.pass.length + ' chars)' : '✗ Missing'
    });

    if (!emailConfig.user || !emailConfig.pass) {
      throw new Error('Email configuration not found. Please check EMAIL_USER and EMAIL_PASS in environment variables.');
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailConfig.user,
        pass: emailConfig.pass,
      },
      pool: true,
      maxConnections: 3,
      secure: true,
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify connection
    console.log('🔐 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified for contact form');

    // Email content for admin (ambhorednyaneshwar27@gmail.com)
    const adminMailOptions = {
      from: `"PlotChamps" <${emailConfig.user}>`,
      to: 'ambhorednyaneshwar27@gmail.com', // ✅ Hardcoded to your email
      subject: `📧 New Contact Form: ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .content {
              padding: 30px;
              background: #f9f9f9;
            }
            .field {
              background: white;
              margin-bottom: 15px;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .field-label {
              font-weight: bold;
              color: #667eea;
              margin-bottom: 8px;
              font-size: 16px;
            }
            .field-value {
              color: #555;
              word-wrap: break-word;
            }
            .message-box {
              background: #f5f7fa;
              padding: 15px;
              border-radius: 5px;
              margin-top: 10px;
              border-left: 4px solid #667eea;
              white-space: pre-wrap;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #999;
              font-size: 12px;
              padding: 20px;
            }
            .timestamp {
              background: #e8f4fd;
              padding: 15px;
              border-radius: 5px;
              margin-top: 20px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">📧 New Contact Form Submission</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">PlotChamps Real Estate</p>
            </div>
            
            <div class="content">
              <div class="field">
                <div class="field-label">👤 Name</div>
                <div class="field-value" style="font-size: 16px;">${name}</div>
              </div>

              <div class="field">
                <div class="field-label">📧 Email</div>
                <div class="field-value">
                  <a href="mailto:${email}" style="color: #667eea; text-decoration: none; font-size: 16px;">${email}</a>
                </div>
              </div>

              <div class="field">
                <div class="field-label">📱 Phone</div>
                <div class="field-value">
                  <a href="tel:${phone}" style="color: #667eea; text-decoration: none; font-size: 16px;">${phone}</a>
                </div>
              </div>

              <div class="field">
                <div class="field-label">📝 Subject</div>
                <div class="field-value" style="font-size: 16px; color: #2c5530; font-weight: bold;">${subject}</div>
              </div>

              <div class="field">
                <div class="field-label">💬 Message</div>
                <div class="message-box" style="font-size: 14px; line-height: 1.5;">${message}</div>
              </div>

              <div class="timestamp">
                <p style="margin: 0; color: #666; font-size: 14px;">
                  <strong>⏰ Received at:</strong> ${new Date().toLocaleString('en-IN', { 
                    timeZone: 'Asia/Kolkata',
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>

            <div class="footer">
              <p>This email was automatically sent from PlotChamps Contact Form</p>
              <p>© 2025 PlotChamps Real Estate. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // Send email with retry mechanism
    let emailSent = false;
    let attempts = 0;
    const maxAttempts = 3;

    while (!emailSent && attempts < maxAttempts) {
      attempts++;
      try {
        console.log(`📤 Attempt ${attempts} to send contact email...`);

        const result = await transporter.sendMail(adminMailOptions);
        console.log('✅ Contact email sent successfully!', {
          messageId: result.messageId,
          to: 'ambhorednyaneshwar27@gmail.com',
          subject: subject
        });

        emailSent = true;

        // Log successful contact submission
        console.log('✅ Contact form processed successfully:', {
          name: name,
          email: email,
          phone: '***' + phone.slice(-3),
          subject: subject,
          messageLength: message.length,
          timestamp: new Date().toISOString()
        });

      } catch (emailError) {
        console.error(`❌ Attempt ${attempts} failed:`, emailError.message);

        if (attempts >= maxAttempts) {
          throw new Error(`Failed to send email after ${maxAttempts} attempts: ${emailError.message}`);
        }

        // Wait before retry (1 second, then 2 seconds, then 3 seconds)
        console.log(`🔄 Retrying in ${attempts} second(s)...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    // Success response
    res.status(200).json({
      success: true,
      message: 'Thank you for contacting us! We have received your message and will get back to you within 24 hours.',
      data: {
        name,
        email,
        subject,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Contact form error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // User-friendly error message
    let userMessage = 'Failed to send your message. Please try again later.';
    
    if (error.message.includes('Email configuration not found')) {
      userMessage = 'Service temporarily unavailable. Please contact us directly at +91 98765 43210.';
    } else if (error.message.includes('Failed to send email')) {
      userMessage = 'Email service is temporarily down. Please try again in a few minutes or contact us at +91 98765 43210.';
    }

    res.status(500).json({
      success: false,
      message: userMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default {
  sendContactEmail
};