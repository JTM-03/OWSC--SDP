const nodemailer = require('nodemailer');
const config = require('../config/environment');

const SENDER_NAME  = 'OWSC - Old Wesleyites Sports Club';
// Use the configured Gmail address as the sender
const SENDER_EMAIL = process.env.EMAIL_USER || 'owsc.admin@gmail.com';

let transporter = null;

function initTransporter() {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS; // Gmail App Password (16-char, no spaces)

    if (!user || !pass) {
        console.warn('⚠️  Email service disabled: EMAIL_USER or EMAIL_PASS missing in .env');
        return;
    }

    transporter = nodemailer.createTransport({
        service: 'gmail',   // nodemailer knows Gmail's SMTP settings automatically
        auth: { user, pass }
    });

    // Verify connection at startup
    transporter.verify((err) => {
        if (err) {
            console.error('❌ Gmail SMTP connection failed:', err.message);
            console.error('   Make sure you are using a Gmail App Password, not your account password.');
            console.error('   Generate one at: https://myaccount.google.com/apppasswords');
            transporter = null;
        } else {
            console.log(`📧 Email service ready — sending via Gmail (${user})`);
        }
    });
}

initTransporter();

/**
 * Core send function — all other functions call this.
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

// ─────────────────────────────────────────────────────────────────────────────
// Email templates
// ─────────────────────────────────────────────────────────────────────────────

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
          <a href="${config.emailLoginUrl}"
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

/**
 * Membership rejection email
 */
async function sendMembershipRejectedEmail(member, reason) {
    const subject = 'OWSC – Membership Application Update';
    const html = `
    <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;background:#f8f5f0;">
      <div style="background:#1a2b3c;padding:32px;text-align:center;">
        <h1 style="color:#D4AF37;margin:0;font-size:28px;letter-spacing:2px;">OWSC</h1>
        <p style="color:rgba(255,255,255,.7);margin:8px 0 0;font-size:12px;letter-spacing:3px;text-transform:uppercase;">Old Wesleyites Sports Club</p>
      </div>
      <div style="padding:40px 32px;background:#fff;border:1px solid #e8e0d0;">
        <h2 style="color:#1a2b3c;margin:0 0 16px;">Dear ${member.fullName},</h2>
        <p style="color:#555;line-height:1.7;margin:0 0 16px;">
          Thank you for your interest in joining the Old Wesleyites Sports Club.
        </p>
        <p style="color:#555;line-height:1.7;margin:0 0 24px;">
          After careful review, we regret to inform you that your membership application has not been approved at this time.
        </p>
        ${reason ? `
        <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:14px;border-radius:4px;margin:0 0 24px;">
          <p style="color:#7f1d1d;margin:0;font-size:13px;line-height:1.6;">
            <strong>Reason:</strong> ${reason}
          </p>
        </div>` : ''}
        <p style="color:#555;line-height:1.7;margin:0 0 24px;">
          You are welcome to reapply in the future. If you have any questions, please contact our administration team.
        </p>
        <p style="color:#888;font-size:13px;">Best Regards,<br><strong style="color:#1a2b3c;">OWSC Administration</strong></p>
      </div>
      <div style="background:#f0ece4;padding:14px;text-align:center;font-size:11px;color:#999;">
        &copy; ${new Date().getFullYear()} Old Wesleyites Sports Club. All rights reserved.
      </div>
    </div>`;
    return sendEmail(member.email, subject, html);
}

/**
 * New member registration confirmation
 */
async function sendRegistrationConfirmationEmail(member) {
    const subject = 'OWSC – Application Received';
    const html = `
    <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;background:#f8f5f0;">
      <div style="background:#1a2b3c;padding:32px;text-align:center;">
        <h1 style="color:#D4AF37;margin:0;font-size:28px;letter-spacing:2px;">OWSC</h1>
        <p style="color:rgba(255,255,255,.7);margin:8px 0 0;font-size:12px;letter-spacing:3px;text-transform:uppercase;">Old Wesleyites Sports Club</p>
      </div>
      <div style="padding:40px 32px;background:#fff;border:1px solid #e8e0d0;">
        <h2 style="color:#1a2b3c;margin:0 0 16px;">Application Received</h2>
        <p style="color:#555;line-height:1.7;margin:0 0 16px;">Dear ${member.fullName},</p>
        <p style="color:#555;line-height:1.7;margin:0 0 24px;">
          Thank you for applying to join the Old Wesleyites Sports Club. We have received your application and it is currently <strong>pending review</strong> by our administration team.
        </p>
        <div style="background:#f0f9ff;border-left:4px solid #0ea5e9;padding:14px;border-radius:4px;margin:0 0 24px;">
          <p style="color:#0c4a6e;margin:0;font-size:13px;line-height:1.6;">
            You will receive an email notification once your application has been reviewed. This typically takes 2–3 business days.
          </p>
        </div>
        <p style="color:#888;font-size:13px;">Best Regards,<br><strong style="color:#1a2b3c;">OWSC Administration</strong></p>
      </div>
      <div style="background:#f0ece4;padding:14px;text-align:center;font-size:11px;color:#999;">
        &copy; ${new Date().getFullYear()} Old Wesleyites Sports Club. All rights reserved.
      </div>
    </div>`;
    return sendEmail(member.email, subject, html);
}

/**
 * Booking submitted — pending payment verification
 */
async function sendBookingSubmittedEmail(member, booking, venue, payment) {
    const subject = `OWSC – Booking Received (#${booking.id})`;
    const bookingDate = new Date(booking.bookingDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const html = `
    <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;background:#f8f5f0;">
      <div style="background:#1a2b3c;padding:32px;text-align:center;">
        <h1 style="color:#D4AF37;margin:0;font-size:28px;letter-spacing:2px;">OWSC</h1>
        <p style="color:rgba(255,255,255,.7);margin:8px 0 0;font-size:12px;letter-spacing:3px;text-transform:uppercase;">Old Wesleyites Sports Club</p>
      </div>
      <div style="padding:40px 32px;background:#fff;border:1px solid #e8e0d0;">
        <h2 style="color:#1a2b3c;margin:0 0 8px;">Booking Received</h2>
        <p style="color:#555;line-height:1.7;margin:0 0 24px;">Dear ${member.fullName},</p>
        <p style="color:#555;line-height:1.7;margin:0 0 24px;">
          We have received your venue booking request. Your booking is currently <strong>pending payment verification</strong> by our administration team.
        </p>

        <!-- Booking Summary -->
        <div style="background:#f8f5f0;border:1px solid #e8e0d0;border-radius:8px;padding:24px;margin:0 0 24px;">
          <p style="color:#1a2b3c;font-weight:bold;font-size:13px;letter-spacing:2px;text-transform:uppercase;margin:0 0 16px;">Booking Summary</p>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:#888;font-size:13px;width:40%;">Booking ID</td><td style="padding:6px 0;color:#1a2b3c;font-weight:bold;font-size:13px;">#${booking.id}</td></tr>
            <tr><td style="padding:6px 0;color:#888;font-size:13px;">Venue</td><td style="padding:6px 0;color:#1a2b3c;font-weight:bold;font-size:13px;">${venue.name}</td></tr>
            <tr><td style="padding:6px 0;color:#888;font-size:13px;">Date</td><td style="padding:6px 0;color:#1a2b3c;font-weight:bold;font-size:13px;">${bookingDate}</td></tr>
            <tr><td style="padding:6px 0;color:#888;font-size:13px;">Time Slot</td><td style="padding:6px 0;color:#1a2b3c;font-weight:bold;font-size:13px;">${booking.timeSlot}</td></tr>
            <tr><td style="padding:6px 0;color:#888;font-size:13px;">Amount Paid</td><td style="padding:6px 0;color:#1a2b3c;font-weight:bold;font-size:13px;">Rs. ${Number(payment.amount).toLocaleString()}</td></tr>
            <tr><td style="padding:6px 0;color:#888;font-size:13px;">Payment Method</td><td style="padding:6px 0;color:#1a2b3c;font-weight:bold;font-size:13px;">${payment.paymentMethod}</td></tr>
            <tr><td style="padding:6px 0;color:#888;font-size:13px;">Status</td><td style="padding:6px 0;"><span style="background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:bold;">Pending Verification</span></td></tr>
          </table>
        </div>

        <div style="background:#f0f9ff;border-left:4px solid #0ea5e9;padding:14px;border-radius:4px;margin:0 0 24px;">
          <p style="color:#0c4a6e;margin:0;font-size:13px;line-height:1.6;">
            You will receive a confirmation email once your payment has been verified. This typically takes 1–2 business days.
          </p>
        </div>
        <p style="color:#888;font-size:13px;">Best Regards,<br><strong style="color:#1a2b3c;">OWSC Administration</strong></p>
      </div>
      <div style="background:#f0ece4;padding:14px;text-align:center;font-size:11px;color:#999;">
        &copy; ${new Date().getFullYear()} Old Wesleyites Sports Club. All rights reserved.
      </div>
    </div>`;
    return sendEmail(member.email, subject, html);
}

/**
 * Booking confirmed — payment verified by admin
 */
async function sendBookingConfirmedEmail(member, booking, venue, payment) {
    const subject = `OWSC – Booking Confirmed! (#${booking.id})`;
    const bookingDate = new Date(booking.bookingDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const html = `
    <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;background:#f8f5f0;">
      <div style="background:#1a2b3c;padding:32px;text-align:center;">
        <h1 style="color:#D4AF37;margin:0;font-size:28px;letter-spacing:2px;">OWSC</h1>
        <p style="color:rgba(255,255,255,.7);margin:8px 0 0;font-size:12px;letter-spacing:3px;text-transform:uppercase;">Old Wesleyites Sports Club</p>
      </div>
      <div style="padding:40px 32px;background:#fff;border:1px solid #e8e0d0;">
        <div style="text-align:center;margin:0 0 28px;">
          <div style="display:inline-block;background:#dcfce7;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;">✓</div>
        </div>
        <h2 style="color:#1a2b3c;margin:0 0 8px;text-align:center;">Booking Confirmed!</h2>
        <p style="color:#555;line-height:1.7;margin:0 0 24px;">Dear ${member.fullName},</p>
        <p style="color:#555;line-height:1.7;margin:0 0 24px;">
          Great news! Your payment has been verified and your venue booking is now <strong style="color:#16a34a;">CONFIRMED</strong>.
        </p>

        <!-- Booking Details -->
        <div style="background:#f8f5f0;border:1px solid #e8e0d0;border-radius:8px;padding:24px;margin:0 0 24px;">
          <p style="color:#1a2b3c;font-weight:bold;font-size:13px;letter-spacing:2px;text-transform:uppercase;margin:0 0 16px;">Booking Details</p>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:#888;font-size:13px;width:40%;">Booking ID</td><td style="padding:6px 0;color:#1a2b3c;font-weight:bold;font-size:13px;">#${booking.id}</td></tr>
            <tr><td style="padding:6px 0;color:#888;font-size:13px;">Venue</td><td style="padding:6px 0;color:#1a2b3c;font-weight:bold;font-size:13px;">${venue.name}</td></tr>
            <tr><td style="padding:6px 0;color:#888;font-size:13px;">Date</td><td style="padding:6px 0;color:#1a2b3c;font-weight:bold;font-size:13px;">${bookingDate}</td></tr>
            <tr><td style="padding:6px 0;color:#888;font-size:13px;">Time Slot</td><td style="padding:6px 0;color:#1a2b3c;font-weight:bold;font-size:13px;">${booking.timeSlot}</td></tr>
            <tr><td style="padding:6px 0;color:#888;font-size:13px;">Amount Paid</td><td style="padding:6px 0;color:#1a2b3c;font-weight:bold;font-size:13px;">Rs. ${Number(payment.amount).toLocaleString()}</td></tr>
            <tr><td style="padding:6px 0;color:#888;font-size:13px;">Status</td><td style="padding:6px 0;"><span style="background:#dcfce7;color:#166534;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:bold;">Confirmed</span></td></tr>
          </table>
        </div>

        <div style="background:#fff8e7;border-left:4px solid #D4AF37;padding:14px;border-radius:4px;margin:0 0 24px;">
          <p style="color:#7a6518;margin:0;font-size:13px;line-height:1.6;">
            📋 Please bring this confirmation email or your booking ID <strong>#${booking.id}</strong> when you arrive at the venue.
          </p>
        </div>
        <p style="color:#888;font-size:13px;">Best Regards,<br><strong style="color:#1a2b3c;">OWSC Administration</strong></p>
      </div>
      <div style="background:#f0ece4;padding:14px;text-align:center;font-size:11px;color:#999;">
        &copy; ${new Date().getFullYear()} Old Wesleyites Sports Club. All rights reserved.
      </div>
    </div>`;
    return sendEmail(member.email, subject, html);
}

/**
 * Booking cancelled (by member or admin)
 */
async function sendBookingCancelledEmail(member, booking, venue, reason, cancelledByAdmin) {
    const subject = `OWSC – Booking Cancelled (#${booking.id})`;
    const bookingDate = new Date(booking.bookingDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const html = `
    <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;background:#f8f5f0;">
      <div style="background:#1a2b3c;padding:32px;text-align:center;">
        <h1 style="color:#D4AF37;margin:0;font-size:28px;letter-spacing:2px;">OWSC</h1>
        <p style="color:rgba(255,255,255,.7);margin:8px 0 0;font-size:12px;letter-spacing:3px;text-transform:uppercase;">Old Wesleyites Sports Club</p>
      </div>
      <div style="padding:40px 32px;background:#fff;border:1px solid #e8e0d0;">
        <h2 style="color:#1a2b3c;margin:0 0 8px;">Booking Cancelled</h2>
        <p style="color:#555;line-height:1.7;margin:0 0 24px;">Dear ${member.fullName},</p>
        <p style="color:#555;line-height:1.7;margin:0 0 24px;">
          ${cancelledByAdmin
            ? 'Your venue booking has been <strong>cancelled by the administration</strong>.'
            : 'Your venue booking has been <strong>cancelled</strong> as requested.'}
        </p>

        <!-- Booking Details -->
        <div style="background:#f8f5f0;border:1px solid #e8e0d0;border-radius:8px;padding:24px;margin:0 0 24px;">
          <p style="color:#1a2b3c;font-weight:bold;font-size:13px;letter-spacing:2px;text-transform:uppercase;margin:0 0 16px;">Cancelled Booking</p>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:#888;font-size:13px;width:40%;">Booking ID</td><td style="padding:6px 0;color:#1a2b3c;font-weight:bold;font-size:13px;">#${booking.id}</td></tr>
            <tr><td style="padding:6px 0;color:#888;font-size:13px;">Venue</td><td style="padding:6px 0;color:#1a2b3c;font-weight:bold;font-size:13px;">${venue.name}</td></tr>
            <tr><td style="padding:6px 0;color:#888;font-size:13px;">Date</td><td style="padding:6px 0;color:#1a2b3c;font-weight:bold;font-size:13px;">${bookingDate}</td></tr>
            <tr><td style="padding:6px 0;color:#888;font-size:13px;">Time Slot</td><td style="padding:6px 0;color:#1a2b3c;font-weight:bold;font-size:13px;">${booking.timeSlot}</td></tr>
            <tr><td style="padding:6px 0;color:#888;font-size:13px;">Status</td><td style="padding:6px 0;"><span style="background:#fee2e2;color:#991b1b;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:bold;">Cancelled</span></td></tr>
          </table>
        </div>

        ${reason ? `
        <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:14px;border-radius:4px;margin:0 0 24px;">
          <p style="color:#7f1d1d;margin:0;font-size:13px;line-height:1.6;">
            <strong>Reason:</strong> ${reason}
          </p>
        </div>` : ''}

        ${cancelledByAdmin ? `
        <p style="color:#555;line-height:1.7;margin:0 0 24px;font-size:13px;">
          If you have any questions regarding this cancellation, please contact our administration team.
        </p>` : ''}

        <p style="color:#888;font-size:13px;">Best Regards,<br><strong style="color:#1a2b3c;">OWSC Administration</strong></p>
      </div>
      <div style="background:#f0ece4;padding:14px;text-align:center;font-size:11px;color:#999;">
        &copy; ${new Date().getFullYear()} Old Wesleyites Sports Club. All rights reserved.
      </div>
    </div>`;
    return sendEmail(member.email, subject, html);
}

module.exports = {
    sendEmail,
    sendPasswordResetOTP,
    sendMembershipApprovedEmail,
    sendMembershipRejectedEmail,
    sendRegistrationConfirmationEmail,
    sendBookingSubmittedEmail,
    sendBookingConfirmedEmail,
    sendBookingCancelledEmail,
};
