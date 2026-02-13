import { Resend } from 'resend';

async function sendEmail({ to, subject, html, text, cc, bcc }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Missing RESEND_API_KEY');
  }
  if (!process.env.RESEND_FROM) {
    throw new Error('Missing RESEND_FROM');
  }
  if (!to || !subject) {
    throw new Error('Missing required fields: to and subject');
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM,
      to,
      subject,
      html,
      text,
      cc,
      bcc,
    });
    return result;
  } catch (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

// Email template functions
async function sendWelcomeEmail(userEmail, userName) {
  return sendEmail({
    to: userEmail,
    subject: 'Welcome to MTPD!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to MTPD, ${userName}!</h2>
        <p>Thanks for joining our driving theory practice platform.</p>
        <p>Start practicing with our quiz modules and highway code sections.</p>
        <p>Good luck with your theory test!</p>
        <hr>
        <p style="color: #666; font-size: 12px;">MTPD Team</p>
      </div>
    `
  });
}

async function sendPasswordResetEmail(userEmail, resetToken, userName) {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  
  return sendEmail({
    to: userEmail,
    subject: 'Password Reset - MTPD',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Hi ${userName},</p>
        <p>You requested to reset your password. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        </div>
        <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">MTPD Team</p>
      </div>
    `
  });
}

async function sendEmailVerification(userEmail, verificationToken, userName) {
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
  
  return sendEmail({
    to: userEmail,
    subject: 'Verify Your Email - MTPD',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify Your Email Address</h2>
        <p>Hi ${userName},</p>
        <p>Please click the button below to verify your email address and activate your account:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Verify Email</a>
        </div>
        <p>If you didn't create an account, you can safely ignore this email.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">MTPD Team</p>
      </div>
    `
  });
}

export { 
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendEmailVerification
};
// Email sending helpers using Resend