// middleware/validationMiddleware.js
const { validationResult } = require('express-validator');

const validateRequest = (schema) => async (req, res, next) => {
  await Promise.all(schema.map(validation => validation.run(req)));
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }
  next();
};

module.exports = { validateRequest };

// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: 'Missing token' });
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, email, role }
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  const role = req.user?.role || 'user';
  if (!roles.includes(role)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  return next();
};

module.exports = { authenticate, authorize };