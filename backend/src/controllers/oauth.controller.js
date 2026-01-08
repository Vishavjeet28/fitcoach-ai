import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate tokens (reuse existing logic)
const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * Find or create user based on OAuth provider data
 * Implements account linking by email
 */
const findOrCreateOAuthUser = async (providerData) => {
  const { providerId, provider, email, name, picture } = providerData;

  // Step 1: Check if user exists with this provider ID
  let userResult;
  if (provider === 'google') {
    userResult = await query('SELECT * FROM users WHERE google_id = $1', [providerId]);
  } else if (provider === 'apple') {
    userResult = await query('SELECT * FROM users WHERE apple_id = $1', [providerId]);
  }

  if (userResult.rows.length > 0) {
    // User exists with this provider - return existing user
    return userResult.rows[0];
  }

  // Step 2: If email exists, check if user exists with this email
  if (email) {
    const emailResult = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    
    if (emailResult.rows.length > 0) {
      // User exists with this email - LINK the account
      const existingUser = emailResult.rows[0];
      
      let updateQuery;
      let updateValues;
      
      if (provider === 'google') {
        updateQuery = `
          UPDATE users 
          SET google_id = $1, 
              profile_picture_url = COALESCE(profile_picture_url, $2),
              auth_provider = CASE 
                WHEN auth_provider = 'email' THEN 'multiple'
                ELSE auth_provider
              END,
              updated_at = NOW()
          WHERE id = $3
          RETURNING *
        `;
        updateValues = [providerId, picture, existingUser.id];
      } else if (provider === 'apple') {
        updateQuery = `
          UPDATE users 
          SET apple_id = $1,
              auth_provider = CASE 
                WHEN auth_provider = 'email' THEN 'multiple'
                ELSE auth_provider
              END,
              updated_at = NOW()
          WHERE id = $2
          RETURNING *
        `;
        updateValues = [providerId, existingUser.id];
      }
      
      const linkedResult = await query(updateQuery, updateValues);
      return linkedResult.rows[0];
    }
  }

  // Step 3: Create new user
  let insertQuery;
  let insertValues;
  
  if (provider === 'google') {
    insertQuery = `
      INSERT INTO users (
        email, name, google_id, auth_provider, profile_picture_url, 
        password_hash, calorie_target
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    insertValues = [
      email ? email.toLowerCase() : null,
      name || 'User',
      providerId,
      'google',
      picture,
      null, // No password for OAuth users
      2000  // Default calorie target
    ];
  } else if (provider === 'apple') {
    insertQuery = `
      INSERT INTO users (
        email, name, apple_id, auth_provider, 
        password_hash, calorie_target
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    insertValues = [
      email ? email.toLowerCase() : null,
      name || 'User',
      providerId,
      'apple',
      null, // No password for OAuth users
      2000  // Default calorie target
    ];
  }

  const newUserResult = await query(insertQuery, insertValues);
  return newUserResult.rows[0];
};

/**
 * Format user data for response (consistent with existing auth endpoints)
 */
const formatUserResponse = (user) => {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    weight: user.weight,
    height: user.height,
    age: user.age,
    gender: user.gender,
    activityLevel: user.activity_level,
    goal: user.goal,
    calorieTarget: user.calorie_target,
    profilePicture: user.profile_picture_url
  };
};

/**
 * POST /api/auth/google
 * Verify Google ID token and authenticate user
 */
export const googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;

    // Validation
    if (!idToken) {
      return res.status(400).json({ error: 'Google ID token is required' });
    }

    // Verify the Google ID token
    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken,
        audience: [
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_ID_IOS,
          process.env.GOOGLE_CLIENT_ID_ANDROID
        ].filter(Boolean) // Remove undefined values
      });
    } catch (error) {
      console.error('Google token verification failed:', error);
      return res.status(401).json({ error: 'Invalid Google token' });
    }

    const payload = ticket.getPayload();
    
    // Extract user information from Google payload
    const providerData = {
      providerId: payload.sub, // Google user ID
      provider: 'google',
      email: payload.email,
      name: payload.name || payload.given_name || 'User',
      picture: payload.picture
    };

    // Check if email is verified
    if (!payload.email_verified) {
      return res.status(403).json({ 
        error: 'Email not verified. Please verify your email with Google first.' 
      });
    }

    // Find or create user (with account linking)
    const user = await findOrCreateOAuthUser(providerData);

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Generate JWT tokens (backend authority)
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    // Update last login
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    // Return same format as /login endpoint
    res.json({
      message: 'Google authentication successful',
      user: formatUserResponse(user),
      accessToken,
      refreshToken
    });

  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Google authentication failed' });
  }
};

/**
 * POST /api/auth/apple
 * Verify Apple identity token and authenticate user
 */
export const appleAuth = async (req, res) => {
  try {
    const { identityToken, user: appleUser } = req.body;

    // Validation
    if (!identityToken) {
      return res.status(400).json({ error: 'Apple identity token is required' });
    }

    // Verify the Apple identity token
    let appleData;
    try {
      appleData = await appleSignin.verifyIdToken(identityToken, {
        audience: process.env.APPLE_CLIENT_ID,
        nonce: undefined, // Optional nonce verification
        ignoreExpiration: false
      });
    } catch (error) {
      console.error('Apple token verification failed:', error);
      return res.status(401).json({ error: 'Invalid Apple token' });
    }

    // Extract user information
    // Note: Apple only provides user info on first sign-in
    const providerId = appleData.sub; // Apple user ID
    let email = appleData.email;
    let name = 'User';

    // On first sign-in, Apple provides additional user data
    if (appleUser) {
      if (appleUser.email) {
        email = appleUser.email;
      }
      if (appleUser.name) {
        const { firstName, lastName } = appleUser.name;
        name = [firstName, lastName].filter(Boolean).join(' ') || 'User';
      }
    }

    const providerData = {
      providerId,
      provider: 'apple',
      email,
      name
    };

    // Find or create user (with account linking)
    const user = await findOrCreateOAuthUser(providerData);

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Generate JWT tokens (backend authority)
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    // Update last login
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    // Return same format as /login endpoint
    res.json({
      message: 'Apple authentication successful',
      user: formatUserResponse(user),
      accessToken,
      refreshToken
    });

  } catch (error) {
    console.error('Apple auth error:', error);
    res.status(500).json({ error: 'Apple authentication failed' });
  }
};
