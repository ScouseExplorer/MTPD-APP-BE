import Joi from 'joi';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/index.js';
import { pool } from '../database/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'change_this_refresh_secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '15m'; // Short-lived access token
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d';

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().max(100).optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

// Helper: Store refresh token in database
async function storeRefreshToken(userId, token) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );
}

// Helper: Get refresh token from database
async function getRefreshToken(userId, token) {
  const result = await pool.query(
    'SELECT * FROM refresh_tokens WHERE user_id = $1 AND token = $2 AND expires_at > NOW() AND revoked = false',
    [userId, token]
  );
  return result.rows[0] || null;
}

// Helper: Revoke old refresh token and store new one
async function replaceRefreshToken(userId, oldToken, newToken) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Revoke old token
    await client.query(
      'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1 AND token = $2',
      [userId, oldToken]
    );
    
    // Store new token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await client.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, newToken, expiresAt]
    );
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function register(payload) {
  const { error } = registerSchema.validate(payload, { abortEarly: false, stripUnknown: true });
  if (error) {
    const details = error.details.map(d => ({ path: d.path.join('.'), message: d.message }));
    const err = new Error('Validation failed');
    err.status = 400;
    err.details = details;
    throw err;
  }
  const { email, password, name } = payload;
  const existing = await User.findOne({ email });
  if (existing) {
    const err = new Error('User already exists');
    err.status = 409;
    throw err;
  }
  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ email, password: hashed, name });
  const accessToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  const refreshToken = jwt.sign({ id: user.id, type: 'refresh' }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES });
  
  // Store refresh token in database
  await storeRefreshToken(user.id, refreshToken);
  
  // Generate email verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await pool.query(
    'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user.id, verificationToken, verificationExpires]
  );
  
  return { 
    user: { id: user.id, email: user.email, name: user.name, verificationToken }, 
    accessToken,
    refreshToken 
  };
}

async function login(payload) {
  const { error } = loginSchema.validate(payload, { abortEarly: false, stripUnknown: true });
  if (error) {
    const details = error.details.map(d => ({ path: d.path.join('.'), message: d.message }));
    const err = new Error('Validation failed');
    err.status = 400;
    err.details = details;
    throw err;
  }
  const { email, password } = payload;
  const user = await User.findOne({ email });
  if (!user) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }
  const valid = await bcrypt.compare(password, user.password || '');
  if (!valid) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }
  
  const accessToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  const refreshToken = jwt.sign({ id: user.id, type: 'refresh' }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES });
  
  // Store refresh token in database
  await storeRefreshToken(user.id, refreshToken);
  
  // Update last login
  await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
  
  return { 
    user: { id: user.id, email: user.email, name: user.name, role: user.role }, 
    accessToken,
    refreshToken
  };
}

// Refresh token functionality
async function refreshTokens(refreshToken) {
  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    // Verify refresh token exists in database and is not revoked
    const storedToken = await getRefreshToken(decoded.id, refreshToken);
    if (!storedToken) {
      throw new Error('Refresh token not found or expired');
    }
    
    const user = await User.findOne({ id: decoded.id });
    if (!user) {
      throw new Error('User not found');
    }
    
    const newAccessToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    const newRefreshToken = jwt.sign({ id: user.id, type: 'refresh' }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES });
    
    // Replace old refresh token with new one (token rotation)
    await replaceRefreshToken(decoded.id, refreshToken, newRefreshToken);
    
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    };
  } catch (error) {
    const err = new Error('Invalid refresh token');
    err.status = 401;
    throw err;
  }
}

// Blacklist token (for logout)
async function blacklistToken(token) {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) return;
    
    const expiresAt = new Date(decoded.exp * 1000);
    await pool.query(
      'INSERT INTO token_blacklist (token, expires_at) VALUES ($1, $2) ON CONFLICT (token) DO NOTHING',
      [token, expiresAt]
    );
  } catch (error) {
    console.error('Error blacklisting token:', error);
  }
}

// Revoke refresh token
async function revokeRefreshToken(token) {
  await pool.query(
    'UPDATE refresh_tokens SET revoked = true WHERE token = $1',
    [token]
  );
}

// Initiate password reset
async function initiatePasswordReset(email) {
  const user = await User.findOne({ email });
  if (!user) {
    // Don't reveal if user exists
    return;
  }
  
  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  
  // Delete any existing reset tokens for this user
  await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);
  
  // Store new reset token
  await pool.query(
    'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user.id, resetToken, expiresAt]
  );
  
  return { resetToken, email: user.email, name: user.name };
}

// Verify and reset password
async function resetPassword(token, newPassword) {
  const result = await pool.query(
    'SELECT * FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW() AND used = false',
    [token]
  );
  
  const resetToken = result.rows[0];
  if (!resetToken) {
    const err = new Error('Invalid or expired reset token');
    err.status = 400;
    throw err;
  }
  
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Update password
    await client.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, resetToken.user_id]
    );
    
    // Mark token as used
    await client.query(
      'UPDATE password_reset_tokens SET used = true WHERE id = $1',
      [resetToken.id]
    );
    
    // Revoke all refresh tokens for security
    await client.query(
      'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1',
      [resetToken.user_id]
    );
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Verify email
async function verifyEmail(token) {
  const result = await pool.query(
    'SELECT * FROM email_verification_tokens WHERE token = $1 AND expires_at > NOW()',
    [token]
  );
  
  const verificationToken = result.rows[0];
  if (!verificationToken) {
    const err = new Error('Invalid or expired verification token');
    err.status = 400;
    throw err;
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Update user verification status
    await client.query(
      'UPDATE users SET is_email_verified = true, updated_at = NOW() WHERE id = $1',
      [verificationToken.user_id]
    );
    
    // Delete used token
    await client.query(
      'DELETE FROM email_verification_tokens WHERE id = $1',
      [verificationToken.id]
    );
    
    await client.query('COMMIT');
    
    const user = await User.findOne({ id: verificationToken.user_id });
    return { user: { id: user.id, email: user.email, name: user.name } };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Change password (for authenticated user)
async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findOne({ id: userId });
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  
  const valid = await bcrypt.compare(currentPassword, user.password || '');
  if (!valid) {
    const err = new Error('Current password is incorrect');
    err.status = 401;
    throw err;
  }
  
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await pool.query(
    'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
    [hashedPassword, userId]
  );
  
  // Revoke all refresh tokens for security
  await pool.query(
    'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1',
    [userId]
  );
}

// Get user by ID
async function getUserById(userId) {
  return await User.findOne({ id: userId });
}

// Generate verification token
async function generateVerificationToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  
  // Delete existing tokens
  await pool.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [userId]);
  
  // Insert new token
  await pool.query(
    'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );
  
  return token;
}

export default { 
  register, 
  login, 
  refreshTokens, 
  blacklistToken,
  revokeRefreshToken,
  initiatePasswordReset,
  resetPassword,
  verifyEmail,
  changePassword,
  getUserById,
  generateVerificationToken,
  registerSchema, 
  loginSchema 
};