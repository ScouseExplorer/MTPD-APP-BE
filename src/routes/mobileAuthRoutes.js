// Mobile App Auth Routes
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const mobileAuthController = require('../controllers/mobileAuthController');
const { authenticate } = require('../middlewares/authMiddleware');
const { validateMobileLogin, validateDeviceInfo } = require('../validators/mobileAuthValidators');

// Mobile-specific auth endpoints
router.post('/mobile/login', validateMobileLogin, mobileAuthController.loginWithDevice);
router.post('/mobile/refresh', mobileAuthController.refreshTokens);
router.post('/mobile/logout', authenticate, mobileAuthController.logoutFromDevice);

// Social authentication for mobile
router.post('/mobile/google', validateDeviceInfo, mobileAuthController.googleLogin);
router.post('/mobile/apple', validateDeviceInfo, mobileAuthController.appleLogin);

// Biometric authentication
router.post('/mobile/biometric/setup', authenticate, mobileAuthController.setupBiometric);
router.post('/mobile/biometric/login', mobileAuthController.biometricLogin);

// Device management
router.get('/mobile/devices', authenticate, mobileAuthController.getDevices);
router.delete('/mobile/devices/:deviceId', authenticate, mobileAuthController.revokeDevice);
router.put('/mobile/devices/:deviceId/push-token', authenticate, mobileAuthController.updatePushToken);

// Mobile-specific user preferences
router.get('/mobile/preferences', authenticate, mobileAuthController.getPreferences);
router.put('/mobile/preferences', authenticate, mobileAuthController.updatePreferences);

// Offline sync endpoints
router.post('/mobile/sync/upload', authenticate, mobileAuthController.syncUpload);
router.get('/mobile/sync/download', authenticate, mobileAuthController.syncDownload);

module.exports = router;