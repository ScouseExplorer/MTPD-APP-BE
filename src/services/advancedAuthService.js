import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { pool } from '../database/index.js';
import { sendPasswordResetEmail, sendEmailVerification } from './emailService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'change_this_refresh_secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '15m';
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d';

// Redis client (optional - fallback to database if not available)
let redisClient = null;
try {
  const Redis = await import('ioredis');
  redisClient = new Redis.default({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => {
      if (times > 3) {
        console.warn('Redis connection failed, using database fallback');
        return null;
      }
      return Math.min(times * 50, 2000);
    }
  });
  
  redisClient.on('error', (err) => {
    console.warn('Redis error:', err.message);
    redisClient = null;
  });
} catch (error) {
  console.warn('Redis not available, using database fallback');
}

// Advanced Auth Features
class AdvancedAuthService {
    
    // Email Verification
    async generateEmailVerificationToken(userId) {
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        
        // Delete any existing verification tokens for this user
        await pool.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [userId]);
        
        // Store in database
        await pool.query(
          'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
          [userId, token, expires]
        );
        
        return token;
    }
    
    async verifyEmail(token) {
        try {
            // Verify token from database
            const result = await pool.query(
              'SELECT * FROM email_verification_tokens WHERE token = $1 AND expires_at > NOW()',
              [token]
            );
            
            const verification = result.rows[0];
            if (!verification) {
                throw new Error('Invalid or expired verification token');
            }
            
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                
                // Update user verification status
                await client.query(
                  'UPDATE users SET is_email_verified = true, updated_at = NOW() WHERE id = $1',
                  [verification.user_id]
                );
                
                // Delete used token
                await client.query(
                  'DELETE FROM email_verification_tokens WHERE id = $1',
                  [verification.id]
                );
                
                await client.query('COMMIT');
                
                return { success: true, userId: verification.user_id };
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } catch (error) {
            const err = new Error('Invalid verification token');
            err.status = 400;
            throw err;
        }
    }
    
    // Password Reset
    async initiatePasswordReset(email) {
        const user = await User.findOne({ email });
        if (!user) {
            // Don't reveal if user exists - return silently
            return { success: true };
        }
        
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        
        // Delete any existing reset tokens for this user
        await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);
        
        // Store reset token in database
        await pool.query(
          'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
          [user.id, resetToken, expires]
        );
        
        // Send reset email
        try {
            await sendPasswordResetEmail(email, resetToken);
        } catch (emailError) {
            console.error('Password reset email failed:', emailError.message);
        }
        
        return { success: true };
    }
    
    async resetPassword(token, newPassword) {
        try {
            // Verify reset token from database
            const result = await pool.query(
              'SELECT * FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW() AND used = false',
              [token]
            );
            
            const reset = result.rows[0];
            if (!reset) {
                throw new Error('Invalid or expired reset token');
            }
            
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                
                // Update user password
                await client.query(
                  'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
                  [hashedPassword, reset.user_id]
                );
                
                // Mark token as used
                await client.query(
                  'UPDATE password_reset_tokens SET used = true WHERE id = $1',
                  [reset.id]
                );
                
                // Revoke all refresh tokens for security
                await client.query(
                  'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1',
                  [reset.user_id]
                );
                
                await client.query('COMMIT');
                
                return { success: true };
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } catch (error) {
            const err = new Error('Invalid reset token');
            err.status = 400;
            throw err;
        }
    }
    
    // Password Change
    async changePassword(userId, currentPassword, newPassword) {
        const user = await User.findOne({ id: userId });
        if (!user) {
            const err = new Error('User not found');
            err.status = 404;
            throw err;
        }
        
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
            const err = new Error('Current password is incorrect');
            err.status = 400;
            throw err;
        }
        
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await pool.query(
          'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
          [hashedNewPassword, userId]
        );
        
        // Revoke all refresh tokens for security
        await pool.query(
          'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1',
          [userId]
        );
        
        return { success: true };
    }
    
    // Token Blacklisting (Redis-based with database fallback)
    async blacklistToken(token) {
        try {
            const decoded = jwt.decode(token);
            if (!decoded || !decoded.exp) return;
            
            const ttl = decoded.exp - Math.floor(Date.now() / 1000);
            if (ttl > 0) {
                // Try Redis first
                if (redisClient) {
                    try {
                        await redisClient.setex(`blacklist:${token}`, ttl, 'true');
                        return;
                    } catch (redisError) {
                        console.warn('Redis blacklist failed, using database');
                    }
                }
                
                // Fallback to database
                const expiresAt = new Date(decoded.exp * 1000);
                await pool.query(
                  'INSERT INTO token_blacklist (token, expires_at) VALUES ($1, $2) ON CONFLICT (token) DO NOTHING',
                  [token, expiresAt]
                );
            }
        } catch (error) {
            console.error('Token blacklisting error:', error.message);
        }
    }
    
    async isTokenBlacklisted(token) {
        try {
            // Try Redis first
            if (redisClient) {
                try {
                    const isBlacklisted = await redisClient.get(`blacklist:${token}`);
                    if (isBlacklisted !== null) {
                        return !!isBlacklisted;
                    }
                } catch (redisError) {
                    console.warn('Redis check failed, using database');
                }
            }
            
            // Fallback to database
            const result = await pool.query(
              'SELECT 1 FROM token_blacklist WHERE token = $1 AND expires_at > NOW()',
              [token]
            );
            return result.rows.length > 0;
        } catch (error) {
            console.error('Token blacklist check error:', error.message);
            return false;
        }
    }
    
    // Refresh Token Management
    async revokeRefreshToken(refreshToken) {
        try {
            await pool.query(
              'UPDATE refresh_tokens SET revoked = true WHERE token = $1',
              [refreshToken]
            );
        } catch (error) {
            console.error('Refresh token revocation error:', error.message);
        }
    }
    
    // Rate Limiting Helpers
    async trackLoginAttempt(ip, email, success = false) {
        try {
            await pool.query(
              'INSERT INTO login_attempts (email, ip_address, success, attempted_at) VALUES ($1, $2, $3, NOW())',
              [email, ip, success]
            );
            
            // If using Redis, also track in Redis for faster lookups
            if (redisClient && !success) {
                const key = `login_attempts:${email}`;
                await redisClient.incr(key);
                await redisClient.expire(key, 900); // 15 minutes
            }
        } catch (error) {
            console.error('Failed to track login attempt:', error.message);
        }
    }
    
    async isAccountLocked(email) {
        try {
            const user = await User.findOne({ email });
            if (!user) return false;
            
            // Check if account is explicitly locked
            if (user.is_account_locked) {
                // Check if lock has expired
                if (user.locked_until && new Date(user.locked_until) > new Date()) {
                    return true;
                } else if (user.locked_until && new Date(user.locked_until) <= new Date()) {
                    // Unlock account
                    await pool.query(
                      'UPDATE users SET is_account_locked = false, locked_until = NULL, failed_login_attempts = 0 WHERE id = $1',
                      [user.id]
                    );
                    return false;
                }
                return true;
            }
            
            // Check recent failed attempts (last 15 minutes)
            const result = await pool.query(
              `SELECT COUNT(*) as count FROM login_attempts 
               WHERE email = $1 AND success = false 
               AND attempted_at > NOW() - INTERVAL '15 minutes'`,
              [email]
            );
            
            const failedAttempts = parseInt(result.rows[0].count);
            
            // Lock account after 5 failed attempts
            if (failedAttempts >= 5) {
                const lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
                await pool.query(
                  'UPDATE users SET is_account_locked = true, locked_until = $1, failed_login_attempts = $2 WHERE email = $3',
                  [lockUntil, failedAttempts, email]
                );
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Account lock check error:', error.message);
            return false;
        }
    }
    
    // Security Audit
    async logSecurityEvent(userId, eventType, metadata = {}) {
        try {
            await pool.query(
              `INSERT INTO security_audit_log (user_id, event_type, ip_address, user_agent, metadata, created_at)
               VALUES ($1, $2, $3, $4, $5, NOW())`,
              [
                userId || null,
                eventType,
                metadata.ip || null,
                metadata.userAgent || null,
                JSON.stringify(metadata)
              ]
            );
        } catch (error) {
            console.error('Security event logging error:', error.message);
        }
    }
}

export default new AdvancedAuthService();