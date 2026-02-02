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

module.exports = {
    signup,
    login,
    logout,
    refreshToken,
    forgotPassword,
    verifyEmail,
    getCurrentUser,
    changePassword

};
//Register, login, logout, refresh token, password reset