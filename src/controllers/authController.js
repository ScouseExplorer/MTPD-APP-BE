const {User} = require('../models')
const jwt = require('jsonwebtoken')
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRequest } = require('../middleware/validationMiddleware');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');
const db = require('../config/database');
const redis = require('../config/redis');
const { hashPassword, comparePassword, generateResetToken } = require('../utils/password');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken, decodeToken } = require('../utils/jwt');
const ResponseHandler = require('../utils/responseHandler');



function jwtSignUser(user) {
    const THREE_MONTHS = 60 * 60 * 24 * 90
    return jwt.sign(user, config.authentication.jwtSecret, {
        expiresIn: THREE_MONTHS
    })
}
// Register a new user 
async function signup(req, res, next) {
    try {
        // run rate limiter middleware programmatically (works for any express middleware)
        await new Promise((resolve, reject) => {
            rateLimiter(req, res, (err) => (err ? reject(err) : resolve()));
        });
        const user = await authController.register(req.body);
        return res.status(201).json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
}

// Login user
async function login(req,res,next) {
    try{
        const result = await authController.login(req.body);
        return res.status(200).json({success:true, data:result});
    } catch (error){
        next(error);
    }
}


async function logout(req,res){
    try{
        const result = await authController.logout(req.body);
        return res.status(200).json({success:true, message:'Logged out successfully'});
    } catch (error){
        res.status(500).json({success:false, message:'Server Error'})
    }
}

async function refreshToken(req, res, next) {
  try {
    const tokens = await authService.refreshToken(req.body);
    return res.status(200).json({ data: tokens });
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req,res,next){
    try{
        const result = await authController.forgotPassword(req.body.email)
        return res.status(200).json({success:true, message:'Password reset email sent'});
    } catch (error){
        next(error);
    }
}

async function verifyEmail(req,res,next){
    try{
        const result = await authController.verifyEmail(req.params.token);
        if (!result){ // try and revisit this logic
            return res.status(200).json({ message: 'Email verified' });
        }
    } catch (error){
        next(error);
    }
}

async function getCurrentUser(req,res,next){
    try{
        // req.user should be set by authentication middleware
        return res.status(200).json({ data: req.user });
    } catch (error){
        next(error);
    }
}

async function changePassword(req,res,next){
    try{
        await authService.changePassword(req.user.id, req.body);
        return res.status(200).json({ success: true, message: 'Password changed successfully' });
    } catch (error){
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