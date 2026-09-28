const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sonic_fingerprint_super_secret_jwt_key_2026';

/**
 * Authentication Middleware.
 * Validates 'Authorization: Bearer <token>' header and attaches user info to req.user.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        message: 'Authentication token missing or invalid format. Please provide Bearer <token>.',
        code: 'AUTH_TOKEN_MISSING'
      }
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId: user._id, email: user.email }
    next();
  } catch (err) {
    return res.status(401).json({
      error: {
        message: 'Invalid or expired authentication token.',
        code: 'AUTH_TOKEN_INVALID'
      }
    });
  }
}

/**
 * Optional Authentication Middleware.
 * If token is present and valid, attaches req.user; otherwise proceeds without failing.
 */
function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } catch (err) {
    // Ignore invalid token in optional mode
  }
  next();
}

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  JWT_SECRET
};
