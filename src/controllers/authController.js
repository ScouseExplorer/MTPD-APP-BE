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
        
        return res.status(201).json({ success: true, data: result.user, token: result.token });
    } catch (error) {
        next(error);
    }
}

// Login user
async function login(req, res, next) {
    try {
        const result = await authService.login(req.body);
        return res.status(200).json({ success: true, data: result.user, token: result.token });
    } catch (error) {
        next(error);
    }
}


async function logout(req, res, next) {
    try {
        // In a stateless JWT system, logout is handled client-side by removing the token
        // For enhanced security, you could blacklist the token in Redis here
        return res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
}

async function refreshToken(req, res, next) {
    try {
        // For now, return error as refresh tokens aren't implemented yet
        return res.status(501).json({ success: false, message: 'Refresh tokens not implemented yet' });
    } catch (error) {
        next(error);
    }
}

async function forgotPassword(req, res, next) {
    try {
        const { email } = req.body;
        // TODO: Generate reset token and save to database
        // For now, just send success response
        return res.status(200).json({ success: true, message: 'Password reset email sent if account exists' });
    } catch (error) {
        next(error);
    }
}

async function verifyEmail(req, res, next) {
    try {
        const { token } = req.params;
        // TODO: Verify token and update user email verification status
        return res.status(200).json({ success: true, message: 'Email verified successfully' });
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
        // TODO: Implement password change in authService
        return res.status(501).json({ success: false, message: 'Password change not implemented yet' });
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