import nodemailer from 'nodemailer';
import { config } from '../config.js';

let transporter;

function getTransporter() {
  transporter ??= nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  });
  return transporter;
}

/**
 * Sends the password reset OTP. Without SMTP settings (local development)
 * the OTP is printed to the server console instead.
 */
export async function sendOtpEmail(user, otp) {
  if (!config.smtp.enabled) {
    if (config.env !== 'test') {
      console.log(`[DEV] Password reset OTP for ${user.email}: ${otp}`);
    }
    return;
  }

  const minutes = config.otp.expiryMinutes;
  await getTransporter().sendMail({
    from: config.smtp.from,
    to: user.email,
    subject: 'Your StockSense password reset code',
    text: `Hi ${user.name},\n\nYour password reset code is ${otp}. It expires in ${minutes} minutes.\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>Hi ${escapeHtml(user.name)},</p>
<p>Your password reset code is:</p>
<p style="font-size:24px;font-weight:bold;letter-spacing:4px">${otp}</p>
<p>It expires in ${minutes} minutes. If you did not request this, you can ignore this email.</p>`,
  });
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
