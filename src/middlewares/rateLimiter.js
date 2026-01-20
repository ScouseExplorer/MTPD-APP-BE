//  Rate limiting middleware to prevent abuse and limit request rates
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('../config/redis');

// Login rate limiter
const loginLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:login:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

// Registration rate limiter
const registerLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:register:'
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts
  message: {
    success: false,
    message: 'Too many registration attempts. Please try again after 1 hour.'
  }
});

// Password reset rate limiter
const passwordResetLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:reset:'
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again after 1 hour.'
  }
});

// General API rate limiter
const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:api:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests
  message: {
    success: false,
    message: 'Too many requests. Please try again later.'
  }
});

module.exports = {
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  apiLimiter
};