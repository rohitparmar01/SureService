const nodemailer = require('nodemailer');

const normalizeEnvValue = (value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return trimmed.replace(/^['\"]|['\"]$/g, '');
};

const getSmtpUser = () =>
  normalizeEnvValue(process.env.SMTP_USER || process.env.SMTP_USERNAME || process.env.EMAIL_USER || '');

const getSmtpPassword = () =>
  normalizeEnvValue(process.env.SMTP_PASSWORD || process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || '');

const getFrontendBaseUrl = () =>
  normalizeEnvValue(process.env.FRONTEND_URL || process.env.PUBLIC_FRONTEND_URL || process.env.CLIENT_URL || process.env.APP_URL || '') ||
  'http://localhost:5173';

/**
 * EMAIL SERVICE - Production-Ready Nodemailer Configuration
 * 
 * Features:
 * - SMTP-based email delivery
 * - HTML and plain text support
 * - Professional email templates
 * - Error handling and logging
 * - Secure configuration via environment variables
 * 
 * Supported Providers:
 * - Gmail (smtp.gmail.com)
 * - Custom SMTP servers
 * - Other providers (Outlook, Yahoo, etc.)
 */

// ====================================
// NODEMAILER TRANSPORTER CONFIGURATION
// ====================================

/**
 * Create reusable transporter object using SMTP
 * 
 * For Gmail:
 * - Enable 2-Factor Authentication
 * - Generate App Password: https://myaccount.google.com/apppasswords
 * - Use App Password instead of regular password
 */
const createTransporter = (overrides = {}) => {
  const smtpUser = getSmtpUser();
  const smtpPassword = getSmtpPassword();
  const smtpPort = Number(overrides.port || parseInt(process.env.SMTP_PORT || '587'));
  const explicitSecure = process.env.SMTP_SECURE;
  const secureFromEnv = explicitSecure === undefined ? undefined : explicitSecure === 'true';
  const secure = typeof overrides.secure === 'boolean'
    ? overrides.secure
    : (secureFromEnv === undefined ? smtpPort === 465 : secureFromEnv);

  const config = {
    host: normalizeEnvValue(overrides.host || process.env.SMTP_HOST || 'smtp.gmail.com'),
    port: smtpPort,
    secure,
    auth: {
      user: smtpUser,
      pass: smtpPassword
    },
    tls: {
      // Keep compatible with hosted SMTP providers that use valid but non-standard chains.
      rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED === 'true'
    },
    // Pooling can cause stale sockets in some hosted/serverless environments.
    pool: process.env.SMTP_POOL === 'true',
    maxConnections: 5,
    maxMessages: 100,
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 10000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 10000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 20000)
  };

  return nodemailer.createTransport(config);
};

// Singleton transporter — reused across all email sends
let _transporter = null;
const getTransporter = () => {
  if (!_transporter) {
    _transporter = createTransporter();
  }
  return _transporter;
};

// ====================================
// EMAIL TEMPLATES
// ====================================

/**
 * Password Reset Email Template (HTML + Plain Text)
 */
const getPasswordResetEmailTemplate = (name, resetUrl, expiryMinutes = 15) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .email-container {
          max-width: 600px;
          margin: 20px auto;
          background: #ffffff;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #ffffff;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content {
          padding: 40px 30px;
        }
        .content h2 {
          color: #333;
          font-size: 24px;
          margin-bottom: 20px;
        }
        .content p {
          font-size: 16px;
          color: #555;
          margin-bottom: 15px;
        }
        .cta-button {
          display: inline-block;
          padding: 15px 40px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 50px;
          font-weight: 600;
          font-size: 16px;
          margin: 20px 0;
          transition: transform 0.2s;
        }
        .cta-button:hover {
          transform: translateY(-2px);
        }
        .info-box {
          background: #f8f9fa;
          border-left: 4px solid #667eea;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .info-box p {
          margin: 0;
          font-size: 14px;
          color: #666;
        }
        .link-text {
          word-break: break-all;
          background: #f8f9fa;
          padding: 10px;
          border-radius: 4px;
          font-size: 14px;
          color: #667eea;
          margin: 15px 0;
        }
        .footer {
          background: #f8f9fa;
          padding: 20px 30px;
          text-align: center;
          font-size: 14px;
          color: #666;
        }
        .security-note {
          border-top: 1px solid #e0e0e0;
          padding-top: 20px;
          margin-top: 30px;
          font-size: 14px;
          color: #777;
        }
        .warning {
          color: #d32f2f;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <!-- Header -->
        <div class="header">
          <h1>🔐 Password Reset Request</h1>
        </div>

        <!-- Content -->
        <div class="content">
          <h2>Hi ${name},</h2>
          
          <p>
            We received a request to reset your password for your account. 
            If you made this request, click the button below to reset your password:
          </p>

          <div style="text-align: center;">
            <a href="${resetUrl}" class="cta-button">Reset Password</a>
          </div>

          <div class="info-box">
            <p><strong>⏱️ This link will expire in ${expiryMinutes} minutes</strong></p>
          </div>

          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <div class="link-text">${resetUrl}</div>

          <div class="security-note">
            <p><strong>🛡️ Security Tips:</strong></p>
            <ul style="padding-left: 20px; margin: 10px 0;">
              <li>This link is single-use and will be invalidated after resetting your password</li>
              <li>Never share this link with anyone</li>
              <li>If you didn't request this reset, <span class="warning">please ignore this email</span></li>
              <li>Consider changing your password if you suspect unauthorized activity</li>
            </ul>
          </div>

          <p style="margin-top: 30px;">
            <strong>Didn't request a password reset?</strong><br>
            If you didn't make this request, you can safely ignore this email. 
            Your password will remain unchanged.
          </p>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
          <p>&copy; ${new Date().getFullYear()} SureService - Service Management Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Plain text version for email clients that don't support HTML
  const text = `
Hi ${name},

We received a request to reset your password for your account.

To reset your password, please visit the following link:
${resetUrl}

⏱️ This link will expire in ${expiryMinutes} minutes.

🛡️ Security Tips:
- This link is single-use and will be invalidated after resetting your password
- Never share this link with anyone
- If you didn't request this reset, please ignore this email
- Consider changing your password if you suspect unauthorized activity

Didn't request a password reset?
If you didn't make this request, you can safely ignore this email. Your password will remain unchanged.

This is an automated email. Please do not reply to this message.

© ${new Date().getFullYear()} SureService - Service Management Platform. All rights reserved.
  `.trim();

  return { html, text };
};

// ====================================
// EMAIL SENDING FUNCTIONS
// ====================================

/**
 * Send Password Reset Email
 * 
 * @param {Object} options - Email options
 * @param {string} options.email - Recipient email address
 * @param {string} options.name - Recipient name
 * @param {string} options.resetToken - Password reset token
 * @param {string} options.userType - 'user' or 'vendor'
 * @returns {Promise<Object>} Email sending result
 */
const sendPasswordResetEmail = async ({ email, name, resetToken, userType = 'user' }) => {
  try {
    // Validate required fields
    if (!email || !name || !resetToken) {
      throw new Error('Missing required fields: email, name, or resetToken');
    }

    // Validate SMTP configuration
    const smtpUser = getSmtpUser();
    const smtpPassword = getSmtpPassword();
    if (!smtpUser || !smtpPassword) {
      throw new Error('SMTP credentials not configured. Please set SMTP_USER and SMTP_PASSWORD in .env');
    }

    // Build reset URL — same path for both user and vendor (token identifies account type)
    const frontendUrl = getFrontendBaseUrl();
    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

    // Get email template
    const { html, text } = getPasswordResetEmailTemplate(name, resetUrl, 15);

    // Email options
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'SureService'}" <${smtpUser}>`,
      to: email,
      subject: '🔐 Password Reset Request - SureService',
      text,
      html
    };

    const sendUsingTransporter = async (overrides = {}) => {
      const transporter = createTransporter(overrides);
      try {
        return await transporter.sendMail(mailOptions);
      } finally {
        if (process.env.SMTP_POOL !== 'true') {
          transporter.close();
        }
      }
    };

    let info;
    try {
      info = await sendUsingTransporter();
    } catch (primaryError) {
      const defaultPort = parseInt(process.env.SMTP_PORT || '587');
      const fallbackPort = defaultPort === 465 ? 587 : 465;
      const fallbackSecure = fallbackPort === 465;

      console.warn(`⚠️ Primary SMTP attempt failed (${primaryError.message}). Retrying with fallback port ${fallbackPort}.`);
      info = await sendUsingTransporter({ port: fallbackPort, secure: fallbackSecure });
    }
    
    
    return {
      success: true,
      messageId: info.messageId,
      message: 'Password reset email sent successfully'
    };

  } catch (error) {
    console.error('❌ Error sending password reset email:', error.message);
    
    // Re-throw with more context
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
};

/**
 * Send Test Email (for configuration testing)
 */
const sendTestEmail = async (recipientEmail) => {
  try {
    const transporter = getTransporter();
    const smtpUser = getSmtpUser();

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'SureService'}" <${smtpUser}>`,
      to: recipientEmail,
      subject: '✅ Email Configuration Test - Success!',
      text: 'Your email service is configured correctly!',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px;">
            <h2 style="color: #4CAF50;">✅ Email Configuration Successful!</h2>
            <p>Your Nodemailer SMTP configuration is working correctly.</p>
            <p>You can now send password reset emails to your users.</p>
            <hr style="border: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 14px; color: #666;">
              This is a test email from SureService - Service Management Platform
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    return {
      success: true,
      messageId: info.messageId,
      message: 'Test email sent successfully'
    };

  } catch (error) {
    console.error('❌ Test email failed:', error.message);
    throw error;
  }
};

/**
 * Verify SMTP Configuration
 */
const verifyEmailConfig = async () => {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    return { success: true, message: 'SMTP configuration is valid' };
  } catch (error) {
    console.error('❌ SMTP configuration verification failed:', error.message);
    return { success: false, error: error.message };
  }
};

// ====================================
// EXPORTS
// ====================================

module.exports = {
  sendPasswordResetEmail,
  sendTestEmail,
  verifyEmailConfig,
  createTransporter
};
