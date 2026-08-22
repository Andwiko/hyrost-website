'use strict';

const nodemailer = require('nodemailer');

let transporter = null;

function isConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  if (transporter) return transporter;
  if (!isConfigured()) return null;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  const tx = getTransporter();
  if (!tx) {
    console.log(`📧 [SMTP not configured] To: ${to} | Subject: ${subject}`);
    if (text) console.log(text);
    return { simulated: true };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  return tx.sendMail({ from, to, subject, html, text });
}

async function sendPasswordResetEmail(to, resetUrl) {
  return sendMail({
    to,
    subject: 'Reset Password — Hyrost Realm',
    text: `Reset password Hyrost Realm:\n\n${resetUrl}\n\nLink berlaku 1 jam.`,
    html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
      <h2 style="color:#6366f1;">Hyrost Realm</h2>
      <p>Anda meminta reset password. Klik tombol di bawah:</p>
      <p><a href="${resetUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">Reset Password</a></p>
      <p style="color:#666;font-size:13px;">Link berlaku 1 jam. Abaikan email ini jika Anda tidak meminta reset.</p>
    </div>`,
  });
}

module.exports = { isConfigured, sendMail, sendPasswordResetEmail };
