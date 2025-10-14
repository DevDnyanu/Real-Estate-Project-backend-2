// src/controllers/contactController.js
import nodemailer from 'nodemailer';

/**
 * Send contact form email
 */
export const sendContactEmail = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

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

    // Phone validation (Indian format)
    const phoneRegex = /^[6-9]\d{9}$/;
    const cleanPhone = phone.replace(/[\s\-\+]/g, '');
    if (!phoneRegex.test(cleanPhone.slice(-10))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }

    // Create transporter with production configuration
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD // Gmail App Password (16 characters without spaces)
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify transporter configuration
    try {
      await transporter.verify();
      console.log('✅ Email server is ready to send messages');
    } catch (verifyError) {
      console.error('❌ Email server verification failed:', verifyError);
      throw new Error('Email service is not available. Please try again later.');
    }

    // Email content for admin
    const adminMailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject: `New Contact Form Submission: ${subject}`,
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
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: white;
              padding: 30px;
              border-radius: 0 0 10px 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .field {
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 1px solid #eee;
            }
            .field-label {
              font-weight: bold;
              color: #667eea;
              margin-bottom: 5px;
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
              white-space: pre-wrap;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              color: #999;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📧 New Contact Form Submission</h1>
              <p>PlotChamp Real Estate</p>
            </div>
            <div class="content">
              <div class="field">
                <div class="field-label">👤 Name:</div>
                <div class="field-value">${name}</div>
              </div>

              <div class="field">
                <div class="field-label">📧 Email:</div>
                <div class="field-value"><a href="mailto:${email}">${email}</a></div>
              </div>

              <div class="field">
                <div class="field-label">📱 Phone:</div>
                <div class="field-value"><a href="tel:${phone}">${phone}</a></div>
              </div>

              <div class="field">
                <div class="field-label">📝 Subject:</div>
                <div class="field-value">${subject}</div>
              </div>

              <div class="field">
                <div class="field-label">💬 Message:</div>
                <div class="message-box">${message}</div>
              </div>

              <div style="margin-top: 30px; padding: 15px; background: #e8f4fd; border-radius: 5px;">
                <p style="margin: 0;"><strong>⏰ Received at:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
              </div>
            </div>
            <div class="footer">
              <p>This email was sent from PlotChamp Contact Form</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // Email content for user (auto-reply)
    const userMailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Thank you for contacting PlotChamp! | आमच्याशी संपर्क साधल्याबद्दल धन्यवाद!',
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
              border-radius: 10px 10px 0 0;
            }
            .logo {
              font-size: 40px;
              margin-bottom: 10px;
            }
            .content {
              background: white;
              padding: 30px;
              border-radius: 0 0 10px 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .greeting {
              font-size: 18px;
              margin-bottom: 20px;
            }
            .info-box {
              background: #f5f7fa;
              padding: 20px;
              border-radius: 5px;
              margin: 20px 0;
              border-left: 4px solid #667eea;
            }
            .contact-info {
              background: #e8f4fd;
              padding: 20px;
              border-radius: 5px;
              margin-top: 20px;
            }
            .contact-item {
              margin: 10px 0;
            }
            .divider {
              border-top: 2px solid #eee;
              margin: 30px 0;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              color: #999;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🏘️</div>
              <h1>PlotChamp Real Estate</h1>
              <p>प्लॉटचॅम्प रिअल इस्टेट</p>
            </div>
            <div class="content">
              <div class="greeting">
                <strong>Dear ${name},</strong><br>
                <strong>प्रिय ${name},</strong>
              </div>

              <p>
                Thank you for reaching out to PlotChamp! We have received your message and our team will get back to you within 24 hours.
              </p>
              <p>
                आमच्याशी संपर्क साधल्याबद्दल धन्यवाद! आम्हाला तुमचा संदेश मिळाला आहे आणि आमचा संघ 24 तासांत तुमच्याशी संपर्क साधेल.
              </p>

              <div class="info-box">
                <strong>📝 Your Message Summary / तुमच्या संदेशाचा सारांश:</strong><br><br>
                <strong>Subject / विषय:</strong> ${subject}<br>
                <strong>Message / संदेश:</strong> ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}
              </div>

              <div class="contact-info">
                <strong>📞 Contact Us / आमच्याशी संपर्क साधा:</strong>
                <div class="contact-item">
                  📧 Email: <a href="mailto:info@plotchamp.com">info@plotchamp.com</a>
                </div>
                <div class="contact-item">
                  📱 Phone: +91 98765 43210
                </div>
                <div class="contact-item">
                  🏢 Office: 123 Business District, Mumbai, Maharashtra 400001
                </div>
                <div class="contact-item">
                  ⏰ Hours: Mon-Sat: 9:00 AM - 7:00 PM | Sun: 10:00 AM - 5:00 PM
                </div>
              </div>

              <div class="divider"></div>

              <p style="color: #666; font-size: 14px;">
                <strong>Note:</strong> This is an automated confirmation email. Please do not reply to this email. For any queries, please contact us at info@plotchamp.com
              </p>
              <p style="color: #666; font-size: 14px;">
                <strong>टीप:</strong> हा एक स्वयंचलित पुष्टीकरण ईमेल आहे. कृपया या ईमेलला उत्तर देऊ नका. कोणत्याही प्रश्नासाठी, कृपया आमच्याशी info@plotchamp.com वर संपर्क साधा.
              </p>
            </div>
            <div class="footer">
              <p>© 2025 PlotChamp Real Estate. All rights reserved.</p>
              <p>This email was sent from PlotChamp Contact Form</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // Send emails with retry mechanism
    let emailsSent = false;
    let attempts = 0;
    const maxAttempts = 3;

    while (!emailsSent && attempts < maxAttempts) {
      attempts++;
      try {
        console.log(`📧 Attempt ${attempts} to send emails...`);

        // Send admin email
        const adminInfo = await transporter.sendMail(adminMailOptions);
        console.log('✅ Admin email sent:', adminInfo.messageId);

        // Send user auto-reply
        const userInfo = await transporter.sendMail(userMailOptions);
        console.log('✅ User confirmation email sent:', userInfo.messageId);

        emailsSent = true;

        // Log successful contact submission
        console.log('✅ Contact form submission successful:', {
          name,
          email,
          phone,
          subject,
          timestamp: new Date().toISOString()
        });

      } catch (emailError) {
        console.error(`❌ Attempt ${attempts} failed:`, emailError.message);

        if (attempts >= maxAttempts) {
          throw new Error('Failed to send email after multiple attempts. Please try again later or contact us directly.');
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    res.status(200).json({
      success: true,
      message: 'Thank you for contacting us! We have received your message and will get back to you within 24 hours.',
      data: {
        name,
        email,
        subject
      }
    });

  } catch (error) {
    console.error('❌ Contact form error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send your message. Please try again later or contact us directly at info@plotchamp.com or +91 98765 43210.'
    });
  }
};

export default {
  sendContactEmail
};
