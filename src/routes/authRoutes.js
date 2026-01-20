// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { validateRequest } = require('../middlewares/validateRequest');
const Joi = require('joi');
const authService = require('../services/authService');
const { authenticate } = require('../middlewares/authMiddleware');

const signupSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().max(100).optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

// Signup
router.post('/signup', validateRequest(signupSchema, 'body'), async (req, res) => {
  try {
    const { user, token } = await authService.register(req.body);
    return res.status(201).json({ success: true, data: user, token });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ success: false, message: err.message, errors: err.details || null });
  }
});

// Login
router.post('/login', validateRequest(loginSchema, 'body'), async (req, res) => {
  try {
    const { user, token } = await authService.login(req.body);
    return res.json({ success: true, data: user, token });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ success: false, message: err.message, errors: err.details || null });
  }
});

// Protected current user
router.get('/me', authenticate, async (req, res) => {
  return res.json({ success: true, user: req.user });
});

module.exports = router;