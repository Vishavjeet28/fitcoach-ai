import { validationResult } from 'express-validator';

// Middleware to check validation results
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array() 
    });
  }
  next();
};

// Sanitize user input to prevent XSS
export const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      // Remove potentially dangerous HTML/script tags
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const key in obj) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
};

// Validate email format
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
export const isStrongPassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

// Rate limiting per user (in addition to IP-based)
const userRequestCounts = new Map();

export const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    if (!req.user || !req.user.id) {
      return next();
    }

    const userId = req.user.id;
    const now = Date.now();
    const userKey = `user_${userId}`;

    if (!userRequestCounts.has(userKey)) {
      userRequestCounts.set(userKey, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const userData = userRequestCounts.get(userKey);

    if (now > userData.resetTime) {
      // Reset counter
      userRequestCounts.set(userKey, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (userData.count >= maxRequests) {
      return res.status(429).json({ 
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((userData.resetTime - now) / 1000)
      });
    }

    userData.count++;
    next();
  };
};

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of userRequestCounts.entries()) {
    if (now > value.resetTime) {
      userRequestCounts.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute

export default {
  validate,
  sanitizeInput,
  isValidEmail,
  isStrongPassword,
  userRateLimit
};
