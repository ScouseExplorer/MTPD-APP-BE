const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465
  auth: {
    user: process.env.SMTP_USER || 'user@example.com',
    pass: process.env.SMTP_PASS || 'password'
  }
});


async  function sendEmail(to, subject, text, html) {
    const info = await transporter. sendEmail({
    from: from || process.env.EMAIL_FROM || '"No Reply" <no-reply@example.com>',
    to: email,
    subject: "Verify your email",
    text: "Click the link to verify your email",
    html: "<p>Click the link to verify your email</p>",

    });
    return info;
}

app.use("/ send-email", 
  rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  })

);

module.exports = { sendMail, transporter };
// Email sending, templates, notifications