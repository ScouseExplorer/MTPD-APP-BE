const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail({ to, subject, html, text, cc, bcc }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY');
  }
  if (!process.env.RESEND_FROM) {
    throw new Error('Missing RESEND_FROM');
  }

  return resend.emails.send({
    from: process.env.RESEND_FROM,
    to,
    subject,
    html,
    text,
    cc,
    bcc,
  });
}

module.exports = { sendEmail };
// Email sending helpers using Resend