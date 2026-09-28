/**
 * Centralized Error Handling Middleware.
 * Logs all errors server-side and formats a clean JSON error response.
 * Never leaks stack traces to the client when NODE_ENV is production.
 */
function errorHandler(err, req, res, next) {
  // Log full error details server-side
  console.error(`[Error Handler] ${req.method} ${req.originalUrl}:`, err);

  const statusCode = err.statusCode || err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  const response = {
    error: {
      message: err.message || 'An unexpected internal server error occurred.',
      code: err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR')
    }
  };

  // Only attach stack trace or debug info if NOT in production
  if (!isProduction && err.stack) {
    response.error.stack = err.stack;
  }

  // Handle Multer upload errors specifically
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      response.error.message = 'Uploaded file exceeds the maximum allowed size of 10MB.';
      response.error.code = 'FILE_TOO_LARGE';
      return res.status(400).json(response);
    }
    response.error.message = `File upload error: ${err.message}`;
    response.error.code = err.code;
    return res.status(400).json(response);
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    response.error.message = 'Database validation error.';
    response.error.code = 'VALIDATION_ERROR';
    response.error.details = Object.keys(err.errors).map(key => ({
      field: key,
      message: err.errors[key].message
    }));
    return res.status(400).json(response);
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;
