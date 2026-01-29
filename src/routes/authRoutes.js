import express from 'express';
import { validateRequest } from '../middlewares/validateRequest.js';
import { registerLimiter, loginLimiter, passwordResetLimiter } from '../middlewares/rateLimiter.js';
import Joi from 'joi';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

const signupSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().max(100).optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

// Signup with rate limiting
router.post('/signup', 
  registerLimiter,
  validateRequest(signupSchema, 'body'), 
  authController.signup
);

// Login with rate limiting
router.post('/login', 
  loginLimiter,
  validateRequest(loginSchema, 'body'), 
  authController.login
);

// Logout
router.post('/logout', authenticate, authController.logout);

// Forgot password with rate limiting
router.post('/forgot-password',
  passwordResetLimiter,
  validateRequest(forgotPasswordSchema, 'body'),
  authController.forgotPassword
);

// Verify email
router.get('/verify-email/:token', authController.verifyEmail);

// Get current user
router.get('/me', authenticate, authController.getCurrentUser);

// Change password
router.put('/change-password', authenticate, authController.changePassword);

module.exports = router;