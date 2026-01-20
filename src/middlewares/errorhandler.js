//  Global error handling middleware,
//  catch all errors, format error responses

const ResponseHandler = require('../utils/responseHandler');

// 404 handler
const notFoundHandler = (req, res, next) => {
  ResponseHandler.notFound(res, `Route ${req.originalUrl} not found`);
};

// Global error handler
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return ResponseHandler.unauthorized(res, 'Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    return ResponseHandler.unauthorized(res, 'Token expired');
  }

  // Database errors
  if (err.code === '23505') { // Unique violation
    return ResponseHandler.badRequest(res, 'Duplicate entry');
  }

  if (err.code === '23503') { // Foreign key violation
    return ResponseHandler.badRequest(res, 'Referenced record does not exist');
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return ResponseHandler.badRequest(res, err.message);
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  ResponseHandler.error(res, message, statusCode);
};

module.exports = {
  notFoundHandler,
  errorHandler
};