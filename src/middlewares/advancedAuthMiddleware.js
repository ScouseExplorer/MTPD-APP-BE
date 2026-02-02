const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const advancedAuthService = require('../services/advancedAuthService');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

// Enhanced Authentication Middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }
    
    // Check if token is blacklisted
    const isBlacklisted = await advancedAuthService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({ success: false, message: 'Token has been revoked' });
    }
    
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, email }
    req.token = token; // Store for potential blacklisting on logout
    
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({ success: false, message: 'Invalid access token' });
  }
};

// Role-based Authorization
const authorize = (...roles) => (req, res, next) => {
  const userRole = req.user?.role || 'user';
  if (!roles.includes(userRole)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Insufficient permissions',
      required: roles,
      current: userRole
    });
  }
  return next();
};

// Optional Authentication (for routes that work with/without auth)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    if (token) {
      const isBlacklisted = await advancedAuthService.isTokenBlacklisted(token);
      if (!isBlacklisted) {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        req.token = token;
      }
    }
    
    return next();
  } catch (err) {
    // Continue without authentication if token is invalid
    return next();
  }
};

// Rate Limiting Middlewares
const createAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 account creations per hour per IP
  message: {
    success: false,
    message: 'Too many accounts created from this IP, please try again after an hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 minutes per IP
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many login attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset requests per hour per IP
  message: {
    success: false,
    message: 'Too many password reset requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Security Headers Middleware
const securityHeaders = (req, res, next) => {
  // Prevent auth endpoints from being cached
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  });
  
  next();
};

// Email Verification Required Middleware
const requireEmailVerification = (req, res, next) => {
  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required',
      code: 'EMAIL_NOT_VERIFIED'
    });
  }
  next();
};

// Account Status Check Middleware
const checkAccountStatus = async (req, res, next) => {
  try {
    // Check if account is locked, suspended, etc.
    const isLocked = await advancedAuthService.isAccountLocked(req.user.email);
    if (isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to security reasons'
      });
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
  requireEmailVerification,
  checkAccountStatus,
  securityHeaders,
  createAccountLimiter,
  loginLimiter,
  passwordResetLimiter
};