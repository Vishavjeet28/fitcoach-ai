import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Authentication token required' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Tokens in this project may encode the user identifier as either `userId` or `id`
      // (depending on which helper generated the token).
      const userId = decoded?.userId ?? decoded?.id;

      if (!userId) {
        return res.status(403).json({ error: 'Invalid token' });
      }

      // Verify user still exists and is active
      const result = await query(
        'SELECT id, email, name, is_active FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = result.rows[0];

      if (!user.is_active) {
        return res.status(403).json({ error: 'Account is deactivated' });
      }

      // Attach user to request
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name
      };

      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
      }
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(403).json({ error: 'Invalid token' });
      }
      throw jwtError;
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const userId = decoded?.userId ?? decoded?.id;

      if (!userId) {
        req.user = null;
        return next();
      }

      const result = await query(
        'SELECT id, email, name, is_active FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length > 0 && result.rows[0].is_active) {
        req.user = {
          id: result.rows[0].id,
          email: result.rows[0].email,
          name: result.rows[0].name
        };
      } else {
        req.user = null;
      }
    } catch (jwtError) {
      req.user = null;
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    req.user = null;
    next();
  }
};

// Middleware to validate refresh tokens
export const authenticateRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      // Check if refresh token exists and is not revoked
      const result = await query(
        `SELECT rt.id, rt.user_id, rt.is_revoked, rt.expires_at, u.is_active
         FROM refresh_tokens rt
         JOIN users u ON u.id = rt.user_id
         WHERE rt.token = $1`,
        [refreshToken]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({ error: 'Invalid refresh token' });
      }

      const tokenData = result.rows[0];

      if (tokenData.is_revoked) {
        return res.status(403).json({ error: 'Refresh token has been revoked' });
      }

      if (new Date(tokenData.expires_at) < new Date()) {
        return res.status(403).json({ error: 'Refresh token expired' });
      }

      if (!tokenData.is_active) {
        return res.status(403).json({ error: 'Account is deactivated' });
      }

      req.userId = tokenData.user_id;
      req.refreshTokenId = tokenData.id;

      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(403).json({ error: 'Refresh token expired' });
      }
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(403).json({ error: 'Invalid refresh token' });
      }
      throw jwtError;
    }
  } catch (error) {
    console.error('Refresh token auth error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
};
