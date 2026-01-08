import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

// Generate tokens
const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' } // Short-lived access token
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' } // Long-lived refresh token
  );
};

// Register new user
export const register = async (req, res) => {
  try {
    const { email, password, name, weight, height, age, gender, activityLevel, goal } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Calculate calorie target based on user data
    let calorieTarget = 2000; // Default
    if (weight && height && age && gender) {
      // Using Mifflin-St Jeor Equation
      let bmr;
      if (gender.toLowerCase() === 'male') {
        bmr = 10 * weight + 6.25 * height - 5 * age + 5;
      } else {
        bmr = 10 * weight + 6.25 * height - 5 * age - 161;
      }

      // Activity level multiplier
      const activityMultipliers = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        veryActive: 1.9
      };
      const multiplier = activityMultipliers[activityLevel] || 1.5;
      let tdee = bmr * multiplier;

      // Adjust based on goal
      if (goal === 'lose_weight') {
        tdee -= 500; // 500 calorie deficit
      } else if (goal === 'gain_weight') {
        tdee += 500; // 500 calorie surplus
      }

      calorieTarget = Math.round(tdee);
    }

    // Create user
    const result = await query(
      `INSERT INTO users (
        email, password_hash, name, weight, height, age, gender,
        activity_level, goal, calorie_target
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, email, name, weight, height, age, gender, activity_level, goal, calorie_target, created_at`,
      [
        email.toLowerCase(),
        passwordHash,
        name,
        weight || null,
        height || null,
        age || null,
        gender || null,
        activityLevel || null,
        goal || null,
        calorieTarget
      ]
    );

    const user = result.rows[0];

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token in database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        weight: user.weight,
        height: user.height,
        age: user.age,
        gender: user.gender,
        activityLevel: user.activity_level,
        goal: user.goal,
        calorieTarget: user.calorie_target
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const result = await query(
      `SELECT id, email, password_hash, name, weight, height, age, gender,
              activity_level, goal, calorie_target, is_active
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
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

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        weight: user.weight,
        height: user.height,
        age: user.age,
        gender: user.gender,
        activityLevel: user.activity_level,
        goal: user.goal,
        calorieTarget: user.calorie_target
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Refresh access token
export const refresh = async (req, res) => {
  try {
    // userId is set by authenticateRefreshToken middleware
    const userId = req.userId;

    // Get user data
    const result = await query(
      `SELECT id, email, name, weight, height, age, gender,
              activity_level, goal, calorie_target
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Generate new access token
    const accessToken = generateAccessToken(user.id);

    res.json({
      message: 'Token refreshed successfully',
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        weight: user.weight,
        height: user.height,
        age: user.age,
        gender: user.gender,
        activityLevel: user.activity_level,
        goal: user.goal,
        calorieTarget: user.calorie_target
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
};

// Logout user
export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Revoke the refresh token
      await query(
        'UPDATE refresh_tokens SET is_revoked = TRUE WHERE token = $1 AND user_id = $2',
        [refreshToken, req.user.id]
      );
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, weight, height, age, gender, activityLevel, goal, calorieTarget } = req.body;

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (weight !== undefined) {
      updates.push(`weight = $${paramCount++}`);
      values.push(weight);
    }
    if (height !== undefined) {
      updates.push(`height = $${paramCount++}`);
      values.push(height);
    }
    if (age !== undefined) {
      updates.push(`age = $${paramCount++}`);
      values.push(age);
    }
    if (gender !== undefined) {
      updates.push(`gender = $${paramCount++}`);
      values.push(gender);
    }
    if (activityLevel !== undefined) {
      updates.push(`activity_level = $${paramCount++}`);
      values.push(activityLevel);
    }
    if (goal !== undefined) {
      updates.push(`goal = $${paramCount++}`);
      values.push(goal);
    }
    if (calorieTarget !== undefined) {
      updates.push(`calorie_target = $${paramCount++}`);
      values.push(calorieTarget);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(userId);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, email, name, weight, height, age, gender, activity_level, goal, calorie_target`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        weight: user.weight,
        height: user.height,
        age: user.age,
        gender: user.gender,
        activityLevel: user.activity_level,
        goal: user.goal,
        calorieTarget: user.calorie_target
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Profile update failed' });
  }
};
