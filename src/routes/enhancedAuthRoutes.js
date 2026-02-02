// Enhanced Auth Routes with Advanced Features
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const {
  authenticate,
  authorize,
  securityHeaders,
  createAccountLimiter,
  loginLimiter,
  passwordResetLimiter,
  requireEmailVerification
} = require('../middlewares/advancedAuthMiddleware');
const { validateRegister, validateLogin, validatePasswordReset } = require('../validators/authValidators');

// Apply security headers to all auth routes
router.use(securityHeaders);

// Public Auth Routes
router.post('/register', createAccountLimiter, validateRegister, authController.signup);
router.post('/login', loginLimiter, validateLogin, authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', passwordResetLimiter, authController.forgotPassword);
router.post('/reset-password/:token', validatePasswordReset, authController.resetPassword);
router.get('/verify-email/:token', authController.verifyEmail);

// OAuth Routes (if using passport)
// router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
// router.get('/google/callback', passport.authenticate('google'), authController.oauthCallback);

// Protected Auth Routes (require authentication)
router.use(authenticate); // All routes below require authentication

router.post('/logout', authController.logout);
router.get('/me', authController.getCurrentUser);
router.post('/change-password', authController.changePassword);
router.post('/resend-verification', authController.resendEmailVerification);

// Admin Only Routes (require admin role)
router.get('/users', authorize('admin'), authController.getAllUsers);
router.put('/users/:id/role', authorize('admin'), authController.updateUserRole);
router.put('/users/:id/lock', authorize('admin'), authController.lockUser);

// Premium/Verified User Routes
router.get('/premium-content', requireEmailVerification, authorize('premium', 'admin'), authController.getPremiumContent);

module.exports = router;