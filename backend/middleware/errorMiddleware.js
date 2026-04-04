/**
 * Error Handling Middleware
 */

/**
 * Handle 404 Not Found errors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Validation error handler for Mongoose
 * @param {Error} err - Mongoose validation error
 * @param {Object} res - Express response object
 */
const handleValidationError = (err, res) => {
  const errors = Object.values(err.errors).map(error => ({
    field: error.path,
    message: error.message
  }));

  res.status(400).json({
    success: false,
    message: 'Validation Error',
    errors
  });
};

/**
 * Handle MongoDB duplicate key errors
 * @param {Error} err - MongoDB error
 * @param {Object} res - Express response object
 */
const handleDuplicateKeyError = (err, res) => {
  const field = Object.keys(err.keyValue)[0];
  const message = `${field} already exists`;

  res.status(409).json({
    success: false,
    message,
    field
  });
};

/**
 * Comprehensive error handler with specific error type handling
 */
const errorHandlerAdvanced = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return handleValidationError(err, res);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    return handleDuplicateKeyError(err, res);
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
  });
};

module.exports = {
  notFound,
  errorHandlerAdvanced
};
