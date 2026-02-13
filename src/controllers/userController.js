import { User } from '../models/index.js';
import bcrypt from 'bcryptjs';
import ResponseHandler from '../utils/responseHandler.js';

export default {
  // Get user profile
  getProfile: async (req, res) => {
    try {
      const user = await User.findOne({ id: req.user.id });
      if (!user) return res.status(404).json({ success: false, message: 'Not found' });
      delete user.password;
      return res.json({ success: true, data: user });
    } catch (error) {
      console.error('Get profile error:', error);
      return ResponseHandler.error(res, 'Failed to get profile', 500);
    }
  },

  // Update user profile
  updateProfile: async (req, res) => {
    try {
      const { name, email } = req.body;

      // Check if email is already taken by another user
      if (email) {
        const existingUser = await User.findOne({ email, id: { $ne: req.user.id } });
        if (existingUser) {
          return ResponseHandler.badRequest(res, 'Email already in use');
        }
      }

      // Update user
      await User.updateOne({ id: req.user.id }, { name, email, updated_at: new Date() });
      const updatedUser = await User.findOne({ id: req.user.id });
      delete updatedUser.password;

      return res.json({ success: true, data: updatedUser });
    } catch (error) {
      console.error('Update profile error:', error);
      return ResponseHandler.error(res, 'Failed to update profile', 500);
    }
  },

  // Change password
  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findOne({ id: req.user.id });

      // Check if user has a password (OAuth users might not)
      if (!user.password) {
        return ResponseHandler.badRequest(
          res,
          'This account uses Google Sign-In and cannot change password'
        );
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password || '');
      if (!isValidPassword) {
        return ResponseHandler.unauthorized(res, 'Current password is incorrect');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await User.updateOne({ id: req.user.id }, { password: hashedPassword, updated_at: new Date() });

      return res.json({ success: true, message: 'Password updated' });
    } catch (error) {
      console.error('Change password error:', error);
      return ResponseHandler.error(res, 'Failed to change password', 500);
    }
  },

  // Delete account
  deleteAccount: async (req, res) => {
    try {
      // Soft delete: update user as deleted
      await User.updateOne({ id: req.user.id }, { deleted_at: new Date() });
      return res.json({ success: true, message: 'Account deleted' });
    } catch (error) {
      console.error('Delete account error:', error);
      return ResponseHandler.error(res, 'Failed to delete account', 500);
    }
  },

  // Admin: Get all users
  getAllUsers: async (_req, res) => {
    try {
      const list = await User.find();
      const sanitized = list.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role, created_at: u.created_at }));
      return res.json({ success: true, data: sanitized });
    } catch (error) {
      console.error('Get all users error:', error);
      return ResponseHandler.error(res, 'Failed to get users', 500);
    }
  },

  // Admin: Update user role
  updateUserRole: async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      const validRoles = ['user', 'admin', 'moderator'];
      if (!validRoles.includes(role)) {
        return ResponseHandler.badRequest(res, 'Invalid role');
      }

      // Check if user exists
      const userCheck = await User.findOne({ id: userId });
      if (!userCheck) {
        return ResponseHandler.notFound(res, 'User not found');
      }

      // Update role
      await User.updateOne({ id: userId }, { role, updated_at: new Date() });

      return res.json({ success: true, message: 'Role updated' });
    } catch (error) {
      console.error('Update user role error:', error);
      return ResponseHandler.error(res, 'Failed to update user role', 500);
    }
  },

  // Admin: Delete user
  deleteUser: async (req, res) => {
    try {
      const { userId } = req.params;

      // Prevent self-deletion
      if (userId === req.user.id.toString()) {
        return ResponseHandler.badRequest(res, 'Cannot delete your own account');
      }

      // Check if user exists
      const userCheck = await User.findOne({ id: userId });
      if (!userCheck) {
        return ResponseHandler.notFound(res, 'User not found');
      }

      // Delete user
      await User.deleteOne({ id: userId });

      return ResponseHandler.success(res, null, 'User deleted successfully', 200);
    } catch (error) {
      console.error('Delete user error:', error);
      return ResponseHandler.error(res, 'Failed to delete user', 500);
    }
  },

  // GET /api/users
  getUsers: async (req, res) => {
    try {
      return ResponseHandler.success(res, { users: [] }, 'Users fetched', 200);
    } catch (err) {
      return ResponseHandler.error(res, 'Failed to fetch users', 500);
    }
  },

  // GET /api/users/:id
  getUser: async (req, res) => {
    try {
      const { id } = req.params;
      return ResponseHandler.success(res, { user: { id } }, 'User fetched', 200);
    } catch (err) {
      return ResponseHandler.error(res, 'Failed to fetch user', 500);
    }
  },

  // POST /api/users
  createUser: async (req, res) => {
    try {
      const data = req.body;
      return ResponseHandler.created(res, { user: data }, 'User created');
    } catch (err) {
      return ResponseHandler.error(res, 'Failed to create user', 500);
    }
  },

  // PUT /api/users/:id
  updateUser: async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      return ResponseHandler.success(res, { user: { id, ...data } }, 'User updated', 200);
    } catch (err) {
      return ResponseHandler.error(res, 'Failed to update user', 500);
    }
  },

  // DELETE /api/users/:id
  deleteUser: async (req, res) => {
    try {
      const { id } = req.params;
      return ResponseHandler.success(res, { id }, 'User deleted', 200);
    } catch (err) {
      return ResponseHandler.error(res, 'Failed to delete user', 500);
    }
  },
};