const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/auth');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate user registration/login input.
 */
function validateAuthInput(email, password, isRegistration = false) {
  const errors = {};

  if (!email || typeof email !== 'string' || !email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.email = 'Invalid email address format.';
  }

  if (!password || typeof password !== 'string') {
    errors.password = 'Password is required.';
  } else if (isRegistration && password.length < 8) {
    errors.password = 'Password must be at least 8 characters in length.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Helper to generate JWT token.
 */
function generateToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * POST /auth/register
 */
router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    const validation = validateAuthInput(email, password, true);
    if (!validation.isValid) {
      return res.status(400).json({
        error: {
          message: 'Validation failed for registration input.',
          code: 'VALIDATION_ERROR',
          fields: validation.errors
        }
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        error: {
          message: 'An account with this email address already exists.',
          code: 'USER_ALREADY_EXISTS'
        }
      });
    }

    // Hash password with bcrypt (salt rounds 10)
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await User.create({
      email: normalizedEmail,
      password_hash
    });

    const token = generateToken(newUser);

    return res.status(201).json({
      message: 'User registered successfully.',
      token,
      user: {
        id: newUser._id.toString(),
        email: newUser.email,
        created_at: newUser.created_at
      }
    });

  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/login
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    const validation = validateAuthInput(email, password, false);
    if (!validation.isValid) {
      return res.status(400).json({
        error: {
          message: 'Validation failed for login input.',
          code: 'VALIDATION_ERROR',
          fields: validation.errors
        }
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Lookup user
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        error: {
          message: 'Invalid email or password.',
          code: 'INVALID_CREDENTIALS'
        }
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        error: {
          message: 'Invalid email or password.',
          code: 'INVALID_CREDENTIALS'
        }
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        created_at: user.created_at
      }
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
