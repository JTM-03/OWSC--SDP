const nodemailer = require('nodemailer');

const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'minjayajanze@gmail.com';
const SENDER_NAME  = 'OWSC - Old Wesleyites Sports Club';

// Brevo SMTP — use your Brevo login email as user, API key as password
let transporter = null;

function initTransporter() {
    const apiKey   = process.env.BREVO_API_KEY;
    const smtpUser = process.env.BREVO_SMTP_USER; // your Brevo account login email

    if (!apiKey || !smtpUser) {
        console.warn('⚠️  Email service disabled: BREVO_API_KEY or BREVO_SMTP_USER missing in .env');
        return;
    }

    transporter = nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false, // STARTTLS
        auth: {
            user: smtpUser,   // Brevo account email
            pass: apiKey      // Brevo API key acts as SMTP password
        }
    });

    // Verify connection at startup
    transporter.verify((err) => {
        if (err) {
            console.error('❌ Brevo SMTP connection failed:', err.message);
            transporter = null;
        } else {
            console.log('📧 Email service ready via Brevo SMTP');
        }
    });
}

initTransporter();

/**
 * Core send function
 */
async function sendEmail(to, subject, html) {
    if (!transporter) {
        console.warn('⚠️  Email transporter not initialised — email NOT sent to:', to);
        return null;
    }

    try {
        const info = await transporter.sendMail({
            from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
            to,
            subject,
            html
        });
        console.log(`✅ Email sent to ${to} | MessageId: ${info.messageId}`);
        return info;
    } catch (err) {
        console.error('❌ Failed to send email to', to, ':', err.message);
        return null;
    }
}

/**
 * OTP email for password reset
 */
async function sendPasswordResetOTP(email, otp, name) {
    const subject = 'OWSC – Password Reset OTP';
    const html = `
    <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;background:#f8f5f0;">
      <div style="background:#1a2b3c;padding:32px;text-align:center;">
        <h1 style="color:#D4AF37;margin:0;font-size:28px;letter-spacing:2px;">OWSC</h1>
        <p style="color:rgba(255,255,255,.7);margin:8px 0 0;font-size:12px;letter-spacing:3px;text-transform:uppercase;">Old Wesleyites Sports Club</p>
      </div>
      <div style="padding:40px 32px;background:#fff;border:1px solid #e8e0d0;">
        <h2 style="color:#1a2b3c;margin:0 0 16px;">Password Reset Request</h2>
        <p style="color:#555;line-height:1.7;margin:0 0 24px;">Dear ${name || 'Member'},</p>
        <p style="color:#555;line-height:1.7;margin:0 0 28px;">
          We received a request to reset your OWSC account password.
          Use the code below — it is valid for <strong>12 minutes</strong>.
        </p>
        <div style="background:#1a2b3c;border-radius:8px;padding:28px;text-align:center;margin:0 0 28px;">
          <p style="color:rgba(255,255,255,.7);margin:0 0 10px;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Your One-Time Password</p>
          <div style="font-size:48px;font-weight:bold;letter-spacing:14px;color:#D4AF37;font-family:monospace;">${otp}</div>
          <p style="color:rgba(255,255,255,.45);margin:12px 0 0;font-size:11px;">Expires in 12 minutes</p>
        </div>
        <div style="background:#fff8e7;border-left:4px solid #D4AF37;padding:14px;border-radius:4px;margin:0 0 24px;">
          <p style="color:#7a6518;margin:0;font-size:13px;line-height:1.6;">
            ⚠️ <strong>Security Notice:</strong> If you did not request this, please ignore this email. Your account remains secure.
          </p>
        </div>
        <p style="color:#888;font-size:13px;">Best Regards,<br><strong style="color:#1a2b3c;">OWSC Administration</strong></p>
      </div>
      <div style="background:#f0ece4;padding:14px;text-align:center;font-size:11px;color:#999;letter-spacing:1px;">
        &copy; ${new Date().getFullYear()} Old Wesleyites Sports Club. All rights reserved.
      </div>
    </div>`;
    return sendEmail(email, subject, html);
}

/**
 * Membership approval email
 */
async function sendMembershipApprovedEmail(member) {
    const subject = 'Welcome to OWSC – Membership Approved!';
    const html = `
    <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;background:#f8f5f0;">
      <div style="background:#1a2b3c;padding:32px;text-align:center;">
        <h1 style="color:#D4AF37;margin:0;font-size:28px;letter-spacing:2px;">OWSC</h1>
        <p style="color:rgba(255,255,255,.7);margin:8px 0 0;font-size:12px;letter-spacing:3px;text-transform:uppercase;">Old Wesleyites Sports Club</p>
      </div>
      <div style="padding:40px 32px;background:#fff;border:1px solid #e8e0d0;">
        <h2 style="color:#1a2b3c;margin:0 0 16px;">Welcome, ${member.fullName}!</h2>
        <p style="color:#555;line-height:1.7;">
          Your membership application for the <strong>Old Wesleyites Sports Club</strong> has been
          <strong style="color:#2e7d32;">APPROVED</strong>.
        </p>
        <p style="color:#555;line-height:1.7;margin:16px 0 32px;">
          You can now log in to the member portal to access exclusive facilities, book venues, and enjoy all member benefits.
        </p>
        <div style="text-align:center;margin:32px 0;">
          <a href="http://localhost:5173/login"
             style="background:#D4AF37;color:#1a2b3c;padding:14px 32px;text-decoration:none;border-radius:4px;font-weight:bold;font-size:14px;letter-spacing:1px;text-transform:uppercase;">
            Login to Member Portal →
          </a>
        </div>
        <p style="color:#888;font-size:13px;">Best Regards,<br><strong style="color:#1a2b3c;">OWSC Administration</strong></p>
      </div>
      <div style="background:#f0ece4;padding:14px;text-align:center;font-size:11px;color:#999;">
        &copy; ${new Date().getFullYear()} Old Wesleyites Sports Club. All rights reserved.
      </div>
    </div>`;
    return sendEmail(member.email, subject, html);
}

module.exports = { sendEmail, sendPasswordResetOTP, sendMembershipApprovedEmail };
