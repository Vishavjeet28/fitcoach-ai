import { query } from '../config/database.js';
import aiService from '../services/ai.service.js';
import billingService from '../services/billingService.js';
import FLE from '../services/fitnessLogicEngine.js';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// HELPER: Check AI Usage with Billing Service
// ============================================================================
const checkAndIncrementAIUsage = async (userId, guestDeviceId, requestType) => {
  const usage = await billingService.checkAIUsage(userId, guestDeviceId);
  
  if (!usage.allowed) {
    return {
      allowed: false,
      error: {
        error: usage.reason,
        code: 'LIMIT_REACHED',
        currentUsage: usage.used,
        remaining: usage.remaining,
        limit: usage.limit
      }
    };
  }

  // Increment after successful check
  await billingService.incrementAIUsage(userId, guestDeviceId, requestType);
  
  return { allowed: true, remaining: usage.remaining - 1 };
};

// ============================================================================
// HELPER: Get AI Context from Daily Decision
// ============================================================================
const getAIContext = async (userId) => {
  try {
    // Get today's decision
    const decisionResult = await query(
      `SELECT ai_context FROM daily_decisions 
       WHERE user_id = $1 AND decision_date = CURRENT_DATE`,
      [userId]
    );

    if (decisionResult.rows.length > 0 && decisionResult.rows[0].ai_context) {
      return decisionResult.rows[0].ai_context;
    }

    // Fallback: compute context
    const summaryResult = await query(
      `SELECT total_calories, total_protein, total_carbs, total_fat,
              total_exercise_calories
       FROM daily_summaries
       WHERE user_id = $1 AND summary_date = CURRENT_DATE`,
      [userId]
    );

    const userResult = await query(
      `SELECT weight, goal, calorie_target FROM users WHERE id = $1`,
      [userId]
    );

    const consumed = summaryResult.rows[0] || {};
    const user = userResult.rows[0] || {};

    return {
      goal: user.goal || 'maintenance',
      calorie_target: user.calorie_target || 2000,
      net_calories: (consumed.total_calories || 0) - (consumed.total_exercise_calories || 0),
      protein_consumed: consumed.total_protein || 0,
      carbs_consumed: consumed.total_carbs || 0,
      fat_consumed: consumed.total_fat || 0,
      weight: user.weight
    };
  } catch (e) {
    console.warn('Failed to get AI context:', e.message);
    return null;
  }
};

// Get meal suggestions
export const getMealSuggestions = async (req, res) => {
  try {
    const userId = req.user.id;
    const guestDeviceId = req.headers['x-device-id'];
    const { dietaryRestrictions, preferredCuisines } = req.body;

    // Check usage limits using billing service
    const usageCheck = await checkAndIncrementAIUsage(userId, guestDeviceId, 'meal_suggestion');
    if (!usageCheck.allowed) {
      return res.status(403).json(usageCheck.error);
    }

    // Get user profile
    const userResult = await query(
      'SELECT calorie_target, goal, dietary_restrictions, preferred_cuisines FROM users WHERE id = $1',
      [userId]
    );

    const user = userResult.rows[0];

    const preferences = {
      calorieTarget: user.calorie_target,
      goal: user.goal,
      dietaryRestrictions: dietaryRestrictions || user.dietary_restrictions || [],
      preferredCuisines: preferredCuisines || user.preferred_cuisines || []
    };

    const suggestions = await aiService.getMealSuggestions(user, preferences);

    // Store in ai_insights table
    await query(
      `INSERT INTO ai_insights (user_id, insight_type, content, metadata)
       VALUES ($1, 'meal_suggestion', $2, $3)`,
      [userId, JSON.stringify(suggestions), JSON.stringify(preferences)]
    );

    res.json({
      message: 'Meal suggestions generated successfully',
      suggestions,
      remaining_requests: usageCheck.remaining
    });
  } catch (error) {
    console.error('Get meal suggestions error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate meal suggestions' });
  }
};

// Recognize food from description
export const recognizeFood = async (req, res) => {
  try {
    const userId = req.user.id;
    const { description } = req.body;

    if (!description || description.length < 3) {
      return res.status(400).json({ error: 'Food description is required' });
    }

    // Check usage limits
    const userToCheck = await query(
      'SELECT subscription_status, ai_usage_count FROM users WHERE id = $1',
      [userId]
    );

    if (userToCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { subscription_status, ai_usage_count } = userToCheck.rows[0];
    const isPro = ['pro', 'premium', 'weekly', 'monthly', 'yearly'].includes(subscription_status);
    
    if (!isPro && ai_usage_count >= 5) {
      return res.status(403).json({ 
        error: 'Free limit reached', 
        code: 'LIMIT_REACHED',
        currentUsage: ai_usage_count, 
        limit: 5 
      });
    }

    const foodInfo = await aiService.recognizeFood(description);

    // Increment usage
    await query(
      'UPDATE users SET ai_usage_count = ai_usage_count + 1 WHERE id = $1',
      [userId]
    );

    res.json({
      message: 'Food recognized successfully',
      food: foodInfo
    });
  } catch (error) {
    console.error('Recognize food error:', error);
    res.status(500).json({ error: error.message || 'Failed to recognize food' });
  }
};

// Get personalized insights
export const getInsights = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check usage limits
    const userToCheck = await query(
      'SELECT subscription_status, ai_usage_count FROM users WHERE id = $1',
      [userId]
    );

    if (userToCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { subscription_status, ai_usage_count } = userToCheck.rows[0];
    const isPro = ['pro', 'premium', 'weekly', 'monthly', 'yearly'].includes(subscription_status);
    
    if (!isPro && ai_usage_count >= 5) {
      return res.status(403).json({ 
        error: 'Free limit reached', 
        code: 'LIMIT_REACHED',
        currentUsage: ai_usage_count, 
        limit: 5 
      });
    }

    // Get user's recent data
    const userResult = await query(
      'SELECT calorie_target, goal FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];

    // Get today's summary
    const todayResult = await query(
      `SELECT * FROM daily_summaries
       WHERE user_id = $1 AND summary_date = CURRENT_DATE`,
      [userId]
    );

    // Get last 7 days average
    const weekResult = await query(
      `SELECT 
        AVG(total_calories) as avg_calories,
        AVG(total_exercise_minutes) as avg_exercise,
        AVG(total_water_ml) as avg_water
       FROM daily_summaries
       WHERE user_id = $1 
         AND summary_date >= CURRENT_DATE - INTERVAL '7 days'`,
      [userId]
    );

    const today = todayResult.rows[0] || {};
    const week = weekResult.rows[0];

    const userData = {
      calorieIntake: parseInt(today.total_calories || 0),
      calorieTarget: user.calorie_target,
      exerciseMinutes: parseInt(week.avg_exercise || 0),
      waterIntake: parseInt(week.avg_water || 0),
      goal: user.goal,
      recentTrend: parseInt(week.avg_calories || 0) > user.calorie_target ? 'over target' : 'on track'
    };

    const insights = await aiService.getPersonalizedInsights(userData);

    // Store insight
    await query(
      `INSERT INTO ai_insights (user_id, insight_type, content, metadata)
       VALUES ($1, 'personalized_insight', $2, $3)`,
      [userId, JSON.stringify(insights), JSON.stringify(userData)]
    );

    // Increment usage
    await query(
      'UPDATE users SET ai_usage_count = ai_usage_count + 1 WHERE id = $1',
      [userId]
    );

    res.json({
      message: 'Insights generated successfully',
      insights
    });
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate insights' });
  }
};

// Ask a fitness question
export const askQuestion = async (req, res) => {
  try {
    const userId = req.user.id;
    const { question } = req.body;

    if (!question || question.length < 5) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Check usage limits
    const userToCheck = await query(
      'SELECT subscription_status, ai_usage_count FROM users WHERE id = $1',
      [userId]
    );

    if (userToCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { subscription_status, ai_usage_count } = userToCheck.rows[0];
    const isPro = ['pro', 'premium', 'weekly', 'monthly', 'yearly'].includes(subscription_status);
    
    if (!isPro && ai_usage_count >= 5) {
      return res.status(403).json({ 
        error: 'Free limit reached', 
        code: 'LIMIT_REACHED',
        currentUsage: ai_usage_count, 
        limit: 5 
      });
    }

    // Get user context
    const userResult = await query(
      'SELECT calorie_target, goal, weight, height, age, gender FROM users WHERE id = $1',
      [userId]
    );
    
    const user = userResult.rows[0];
    const userContext = {
      goal: user.goal,
      calorieTarget: user.calorie_target
    };

    const response = await aiService.askFitnessQuestion(question, userContext);

    // Increment usage
    await query(
      'UPDATE users SET ai_usage_count = ai_usage_count + 1 WHERE id = $1',
      [userId]
    );

    res.json({
      question,
      answer: response.answer
    });
  } catch (error) {
    console.error('Ask question error:', error);

    // If Gemini is misconfigured (bad key, unsupported model, etc.), surface that clearly.
    const msg = String(error?.message || '');
    const looksLikeGeminiConfig =
      /models\//.test(msg) ||
      /not found for API version/i.test(msg) ||
      /API key/i.test(msg) ||
      /No working Gemini model found/i.test(msg);

    if (looksLikeGeminiConfig) {
      return res.status(503).json({
        error: 'AI is temporarily unavailable',
        code: 'AI_UNAVAILABLE',
        details: msg,
      });
    }

    res.status(500).json({ error: error.message || 'Failed to answer question' });
  }
};

// Get user's AI insights history
export const getInsightsHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, limit = 10 } = req.query;

    let queryText = `
      SELECT id, insight_type, content, metadata, created_at, is_read
      FROM ai_insights
      WHERE user_id = $1
    `;
    const values = [userId];

    if (type) {
      queryText += ` AND insight_type = $2`;
      values.push(type);
    }

    queryText += ` ORDER BY created_at DESC LIMIT $${values.length + 1}`;
    values.push(parseInt(limit));

    const result = await query(queryText, values);

    res.json({
      insights: result.rows.map(row => ({
        id: row.id,
        type: row.insight_type,
        content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
        createdAt: row.created_at,
        isRead: row.is_read
      })),
      count: result.rows.length
    });
  } catch (error) {
    console.error('Get insights history error:', error);
    res.status(500).json({ error: 'Failed to get insights history' });
  }
};

// Mark insight as read
export const markInsightRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await query(
      `UPDATE ai_insights 
       SET is_read = true
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Insight not found' });
    }

    res.json({ message: 'Insight marked as read' });
  } catch (error) {
    console.error('Mark insight read error:', error);
    res.status(500).json({ error: 'Failed to mark insight as read' });
  }
};

// List available Gemini models for the current API key.
// Helpful for debugging model-name issues and future provider/model switches.
export const listModels = async (req, res) => {
  try {
    // Delegated to the active provider (Gemini today).
    const provider = aiService?.getProvider?.() || null;
    if (!provider || typeof provider.listModels !== 'function') {
      return res.status(501).json({
        error: 'Model listing is not supported for the current AI provider',
        code: 'MODEL_LIST_UNSUPPORTED',
      });
    }

    const models = await provider.listModels();
    return res.json({ count: models.length, models });
  } catch (error) {
    console.error('List models error:', error);
    res.status(500).json({
      error: 'Failed to list models',
      details: error?.message ? String(error.message) : String(error),
    });
  }
};
