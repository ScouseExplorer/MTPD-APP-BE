// /api/users/* (profile, settings, statistics)
const express = require('express');
const router = express.Router();
const userController = require('../controllers/usercontroller');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const { validateRequest } = require('../middlewares/validateRequest');
const Joi = require('joi');

// Joi schemas
const profileSchema = Joi.object({
  name: Joi.string().max(100).optional()
});

const passwordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .message('Password must be at least 8 chars with uppercase, lowercase, number and special char')
    .required()
});

// User routes (authenticated)
router.get('/profile', authenticate, userController.getProfile);
router.put('/profile', authenticate, validateRequest(profileSchema), userController.updateProfile);

router.put('/password',
  authenticate,
  validateRequest(passwordSchema),
  userController.changePassword
);

router.delete('/account',
  authenticate,
  userController.deleteAccount
);

// Admin routes
router.get('/all',
  authenticate,
  authorize('admin'),
  userController.getAllUsers
);

router.put('/:userId/role',
  authenticate,
  authorize('admin'),
  validateRequest(Joi.object({ role: Joi.string().valid('user', 'admin', 'moderator').required() })),
  userController.updateUserRole
);

router.delete('/:userId',
  authenticate,
  authorize('admin'),
  userController.deleteUser
);

module.exports = router;