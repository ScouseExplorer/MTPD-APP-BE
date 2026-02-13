import authService from '../services/authService.js';
import { sendWelcomeEmail, sendPasswordResetEmail, sendEmailVerification } from '../services/emailService.js';
import ResponseHandler from '../utils/responseHandler.js';



// Register a new user 
async function signup(req, res, next) {
    try {
        const result = await authService.register(req.body);
        
        // Send welcome email
        try {
            await sendWelcomeEmail(result.user.email, result.user.name);
        } catch (emailError) {
            console.error('Welcome email failed:', emailError.message);
        }
        
        return res.status(201).json({ 
            success: true, 
            data: result.user, 
            accessToken: result.accessToken,
            refreshToken: result.refreshToken 
        });
    } catch (error) {
        next(error);
    }
}

// Login user
async function login(req, res, next) {
    try {
        const result = await authService.login(req.body);
        return res.status(200).json({ 
            success: true, 
            data: result.user, 
            accessToken: result.accessToken,
            refreshToken: result.refreshToken 
        });
    } catch (error) {
        next(error);
    }
}


async function logout(req, res, next) {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        const { refreshToken } = req.body;
        
        if (token) {
            await authService.blacklistToken(token);
        }
        
        if (refreshToken) {
            await authService.revokeRefreshToken(refreshToken);
        }
        
        return res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
}

async function refreshToken(req, res, next) {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(400).json({ success: false, message: 'Refresh token required' });
        }
        
        const result = await authService.refreshTokens(refreshToken);
        return res.status(200).json({ 
            success: true, 
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            user: result.user 
        });
    } catch (error) {
        next(error);
    }
}

async function forgotPassword(req, res, next) {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }
        
        await authService.initiatePasswordReset(email);
        
        // Always return success to prevent email enumeration
        return res.status(200).json({ 
            success: true, 
            message: 'Password reset email sent if account exists' 
        });
    } catch (error) {
        // Don't expose if user exists or not
        return res.status(200).json({ 
            success: true, 
            message: 'Password reset email sent if account exists' 
        });
    }
}

async function verifyEmail(req, res, next) {
    try {
        const { token } = req.params;
        
        const result = await authService.verifyEmail(token);
        return res.status(200).json({ 
            success: true, 
            message: 'Email verified successfully',
            data: result.user 
        });
    } catch (error) {
        next(error);
    }
}

async function getCurrentUser(req, res, next) {
    try {
        // req.user should be set by authentication middleware
        return res.status(200).json({ success: true, data: req.user });
    } catch (error) {
        next(error);
    }
}

async function changePassword(req, res, next) {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'Current password and new password are required' 
            });
        }
        
        await authService.changePassword(userId, currentPassword, newPassword);
        return res.status(200).json({ 
            success: true, 
            message: 'Password changed successfully' 
        });
    } catch (error) {
        next(error);
    }
}

async function resetPassword(req, res, next) {
    try {
        const { token } = req.params;
        const { newPassword } = req.body;
        
        if (!newPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'New password is required' 
            });
        }
        
        await authService.resetPassword(token, newPassword);
        return res.status(200).json({ 
            success: true, 
            message: 'Password reset successfully' 
        });
    } catch (error) {
        next(error);
    }
}

async function resendEmailVerification(req, res, next) {
    try {
        const userId = req.user.id;
        const user = await authService.getUserById(userId);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        if (user.is_email_verified) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email already verified' 
            });
        }
        
        const verificationToken = await authService.generateVerificationToken(userId);
        
        try {
            await sendEmailVerification(user.email, verificationToken);
        } catch (emailError) {
            console.error('Verification email failed:', emailError.message);
        }
        
        return res.status(200).json({ 
            success: true, 
            message: 'Verification email sent' 
        });
    } catch (error) {
        next(error);
    }
}

// Admin methods
async function getAllUsers(req, res, next) {
    try {
        const { page = 1, limit = 20, search = '' } = req.query;
        const offset = (page - 1) * limit;
        
        let query = 'SELECT id, email, name, role, is_email_verified, is_account_locked, created_at, last_login FROM users';
        let countQuery = 'SELECT COUNT(*) FROM users';
        let params = [];
        
        if (search) {
            query += ' WHERE email ILIKE $1 OR name ILIKE $1';
            countQuery += ' WHERE email ILIKE $1 OR name ILIKE $1';
            params.push(`%${search}%`);
        }
        
        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);
        
        const { pool } = await import('../database/index.js');
        const [usersResult, countResult] = await Promise.all([
            pool.query(query, params),
            pool.query(countQuery, search ? [`%${search}%`] : [])
        ]);
        
        return res.status(200).json({ 
            success: true, 
            data: usersResult.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(countResult.rows[0].count)
            }
        });
    } catch (error) {
        next(error);
    }
}

async function updateUserRole(req, res, next) {
    try {
        const { id } = req.params;
        const { role } = req.body;
        
        const validRoles = ['user', 'premium', 'admin'];
        if (!role || !validRoles.includes(role)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid role. Must be one of: user, premium, admin' 
            });
        }
        
        const { pool } = await import('../database/index.js');
        const result = await pool.query(
            'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, name, role',
            [role, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        return res.status(200).json({ 
            success: true, 
            message: 'User role updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        next(error);
    }
}

async function lockUser(req, res, next) {
    try {
        const { id } = req.params;
        const { locked, lockDuration = 24 } = req.body; // lockDuration in hours
        
        if (typeof locked !== 'boolean') {
            return res.status(400).json({ 
                success: false, 
                message: 'locked field must be a boolean' 
            });
        }
        
        const { pool } = await import('../database/index.js');
        let query, params;
        
        if (locked) {
            const lockUntil = new Date(Date.now() + lockDuration * 60 * 60 * 1000);
            query = 'UPDATE users SET is_account_locked = true, locked_until = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, is_account_locked, locked_until';
            params = [lockUntil, id];
        } else {
            query = 'UPDATE users SET is_account_locked = false, locked_until = NULL, failed_login_attempts = 0, updated_at = NOW() WHERE id = $1 RETURNING id, email, is_account_locked, locked_until';
            params = [id];
        }
        
        const result = await pool.query(query, params);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        return res.status(200).json({ 
            success: true, 
            message: `User ${locked ? 'locked' : 'unlocked'} successfully`,
            data: result.rows[0]
        });
    } catch (error) {
        next(error);
    }
}

async function getPremiumContent(req, res, next) {
    try {
        // This is a placeholder for premium content
        // You can customize this based on your application's needs
        return res.status(200).json({ 
            success: true, 
            message: 'Premium content access granted',
            data: {
                features: [
                    'Advanced quiz analytics',
                    'Unlimited quiz attempts',
                    'Download study materials',
                    'Priority support',
                    'Ad-free experience'
                ]
            }
        });
    } catch (error) {
        next(error);
    }
}

export {
    signup,
    login,
    logout,
    refreshToken,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendEmailVerification,
    getCurrentUser,
    changePassword,
    getAllUsers,
    updateUserRole,
    lockUser,
    getPremiumContent
};
//Register, login, logout, refresh token, password reset