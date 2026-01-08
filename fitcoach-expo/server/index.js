import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './database.js';
import BytezAI from './bytezAI.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Bytez AI
const ai = new BytezAI(process.env.BYTEZ_API_KEY);

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ============= USER ENDPOINTS =============

// Get user profile
app.get('/api/users/:userId', (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user profile
app.put('/api/users/:userId', (req, res) => {
  try {
    const { name, weight, height, calorie_target, goal } = req.body;
    const stmt = db.prepare(`
      UPDATE users 
      SET name = COALESCE(?, name),
          weight = COALESCE(?, weight),
          height = COALESCE(?, height),
          calorie_target = COALESCE(?, calorie_target),
          goal = COALESCE(?, goal),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    const result = stmt.run(name, weight, height, calorie_target, goal, req.params.userId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.userId);
    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// ============= CHAT ENDPOINTS =============

// Get chat history
app.get('/api/chat/:userId', (req, res) => {
  try {
    const messages = db.prepare(`
      SELECT * FROM chat_messages 
      WHERE user_id = ? 
      ORDER BY created_at ASC
      LIMIT 100
    `).all(req.params.userId);
    
    res.json(messages);
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// Send message to AI coach
app.post('/api/chat/:userId', async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.params.userId;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get user context
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get today's calorie intake
    const today = new Date().toISOString().split('T')[0];
    const todayIntake = db.prepare(`
      SELECT COALESCE(SUM(calories), 0) as total 
      FROM meals 
      WHERE user_id = ? AND DATE(logged_at) = ?
    `).get(userId, today);

    // Save user message
    const insertUserMsg = db.prepare(`
      INSERT INTO chat_messages (user_id, role, content)
      VALUES (?, 'user', ?)
    `);
    const userMsgResult = insertUserMsg.run(userId, message);

    // Check if message is about food/meal
    const isMealLog = /\b(ate|had|eat|eaten|breakfast|lunch|dinner|snack|meal|food)\b/i.test(message);

    let aiResponse;
    let macros = null;

    if (isMealLog) {
      // Use AI to analyze meal
      const mealAnalysis = await ai.analyzeMeal(message);
      
      if (mealAnalysis.error) {
        // Fallback to simple coach response
        aiResponse = await ai.coachResponse(message, {
          goal: user.goal,
          calorieTarget: user.calorie_target,
          currentCalories: todayIntake.total
        });
      } else {
        const mealData = mealAnalysis.content;
        macros = {
          kcal: mealData.calories,
          protein: mealData.protein,
          carbs: mealData.carbs,
          fat: mealData.fat
        };

        // Log meal in database
        db.prepare(`
          INSERT INTO meals (user_id, name, calories, protein, carbs, fat)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(userId, mealData.name, mealData.calories, mealData.protein, mealData.carbs, mealData.fat);

        aiResponse = { content: mealData.response, error: null };
      }
    } else {
      // Regular coach response
      aiResponse = await ai.coachResponse(message, {
        goal: user.goal,
        calorieTarget: user.calorie_target,
        currentCalories: todayIntake.total
      });
    }

    if (aiResponse.error) {
      return res.status(500).json({ error: 'AI service error: ' + aiResponse.error });
    }

    // Save AI response
    const insertAIMsg = db.prepare(`
      INSERT INTO chat_messages (user_id, role, content, macros_kcal, macros_protein, macros_carbs, macros_fat)
      VALUES (?, 'assistant', ?, ?, ?, ?, ?)
    `);
    
    const aiMsgResult = insertAIMsg.run(
      userId, 
      aiResponse.content,
      macros?.kcal || null,
      macros?.protein || null,
      macros?.carbs || null,
      macros?.fat || null
    );

    // Fetch the created messages
    const userMsg = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(userMsgResult.lastInsertRowid);
    const aiMsg = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(aiMsgResult.lastInsertRowid);

    res.json({
      userMessage: userMsg,
      aiMessage: aiMsg
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Clear chat history
app.delete('/api/chat/:userId', (req, res) => {
  try {
    db.prepare('DELETE FROM chat_messages WHERE user_id = ?').run(req.params.userId);
    res.json({ message: 'Chat history cleared' });
  } catch (error) {
    console.error('Clear chat error:', error);
    res.status(500).json({ error: 'Failed to clear chat' });
  }
});

// ============= MEALS ENDPOINTS =============

// Get meals
app.get('/api/meals/:userId', (req, res) => {
  try {
    const { date } = req.query;
    let query = 'SELECT * FROM meals WHERE user_id = ?';
    const params = [req.params.userId];

    if (date) {
      query += ' AND DATE(logged_at) = ?';
      params.push(date);
    }

    query += ' ORDER BY logged_at DESC LIMIT 100';
    const meals = db.prepare(query).all(...params);
    res.json(meals);
  } catch (error) {
    console.error('Get meals error:', error);
    res.status(500).json({ error: 'Failed to fetch meals' });
  }
});

// Log a meal
app.post('/api/meals/:userId', (req, res) => {
  try {
    const { name, calories, protein, carbs, fat, meal_type } = req.body;
    
    if (!name || calories === undefined || protein === undefined || carbs === undefined || fat === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const stmt = db.prepare(`
      INSERT INTO meals (user_id, name, calories, protein, carbs, fat, meal_type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(req.params.userId, name, calories, protein, carbs, fat, meal_type);
    const meal = db.prepare('SELECT * FROM meals WHERE id = ?').get(result.lastInsertRowid);
    
    res.json(meal);
  } catch (error) {
    console.error('Log meal error:', error);
    res.status(500).json({ error: 'Failed to log meal' });
  }
});

// Get daily nutrition summary
app.get('/api/nutrition/daily/:userId', (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const summary = db.prepare(`
      SELECT 
        COALESCE(SUM(calories), 0) as total_calories,
        COALESCE(SUM(protein), 0) as total_protein,
        COALESCE(SUM(carbs), 0) as total_carbs,
        COALESCE(SUM(fat), 0) as total_fat
      FROM meals
      WHERE user_id = ? AND DATE(logged_at) = ?
    `).get(req.params.userId, targetDate);

    res.json(summary);
  } catch (error) {
    console.error('Get daily nutrition error:', error);
    res.status(500).json({ error: 'Failed to fetch nutrition summary' });
  }
});

// ============= WORKOUTS ENDPOINTS =============

// Get workouts
app.get('/api/workouts/:userId', (req, res) => {
  try {
    const { date } = req.query;
    let query = 'SELECT * FROM workouts WHERE user_id = ?';
    const params = [req.params.userId];

    if (date) {
      query += ' AND DATE(logged_at) = ?';
      params.push(date);
    }

    query += ' ORDER BY logged_at DESC LIMIT 100';
    const workouts = db.prepare(query).all(...params);
    res.json(workouts);
  } catch (error) {
    console.error('Get workouts error:', error);
    res.status(500).json({ error: 'Failed to fetch workouts' });
  }
});

// Log a workout
app.post('/api/workouts/:userId', (req, res) => {
  try {
    const { name, duration, calories_burned, workout_type } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Workout name is required' });
    }

    const stmt = db.prepare(`
      INSERT INTO workouts (user_id, name, duration, calories_burned, workout_type)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(req.params.userId, name, duration, calories_burned, workout_type);
    const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(result.lastInsertRowid);
    
    res.json(workout);
  } catch (error) {
    console.error('Log workout error:', error);
    res.status(500).json({ error: 'Failed to log workout' });
  }
});

// Generate workout plan with AI
app.post('/api/workouts/:userId/generate', async (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const workoutPlan = await ai.generateWorkoutPlan({
      goal: user.goal,
      weight: user.weight,
      height: user.height
    });

    if (workoutPlan.error) {
      return res.status(500).json({ error: 'Failed to generate workout plan' });
    }

    res.json(workoutPlan.content);
  } catch (error) {
    console.error('Generate workout error:', error);
    res.status(500).json({ error: 'Failed to generate workout plan' });
  }
});

// ============= WATER INTAKE ENDPOINTS =============

// Get water intake
app.get('/api/water/:userId', (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const water = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM water_intake
      WHERE user_id = ? AND DATE(logged_at) = ?
    `).get(req.params.userId, targetDate);

    res.json({ total: water.total });
  } catch (error) {
    console.error('Get water error:', error);
    res.status(500).json({ error: 'Failed to fetch water intake' });
  }
});

// Log water intake
app.post('/api/water/:userId', (req, res) => {
  try {
    const { amount } = req.body;
    
    if (amount === undefined || amount === null) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    const stmt = db.prepare(`
      INSERT INTO water_intake (user_id, amount)
      VALUES (?, ?)
    `);
    
    const result = stmt.run(req.params.userId, amount);
    const water = db.prepare('SELECT * FROM water_intake WHERE id = ?').get(result.lastInsertRowid);
    
    res.json(water);
  } catch (error) {
    console.error('Log water error:', error);
    res.status(500).json({ error: 'Failed to log water intake' });
  }
});

// ============= RECIPES ENDPOINTS =============

// Get recipes
app.get('/api/recipes', (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM recipes';
    const params = [];

    if (category && category !== 'All') {
      query += ' WHERE category = ?';
      params.push(category);
    }

    query += ' ORDER BY created_at DESC LIMIT 100';
    const recipes = db.prepare(query).all(...params);
    res.json(recipes);
  } catch (error) {
    console.error('Get recipes error:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Generate recipe with AI
app.post('/api/recipes/generate', async (req, res) => {
  try {
    const { requirements } = req.body;
    
    if (!requirements) {
      return res.status(400).json({ error: 'Requirements are needed' });
    }

    const recipe = await ai.generateRecipe(requirements);

    if (recipe.error) {
      return res.status(500).json({ error: 'Failed to generate recipe' });
    }

    // Save recipe to database
    const stmt = db.prepare(`
      INSERT INTO recipes (name, calories, protein, carbs, fat, time_minutes, servings, ingredients, instructions, category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      recipe.content.name,
      recipe.content.calories,
      recipe.content.protein,
      recipe.content.carbs,
      recipe.content.fat,
      recipe.content.time_minutes,
      recipe.content.servings,
      recipe.content.ingredients,
      recipe.content.instructions,
      recipe.content.category
    );

    const savedRecipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(result.lastInsertRowid);
    res.json(savedRecipe);
  } catch (error) {
    console.error('Generate recipe error:', error);
    res.status(500).json({ error: 'Failed to generate recipe' });
  }
});

// ============= DASHBOARD STATS ENDPOINT =============

app.get('/api/dashboard/:userId', (req, res) => {
  try {
    const userId = req.params.userId;
    const today = new Date().toISOString().split('T')[0];

    // Get user
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get today's nutrition
    const nutrition = db.prepare(`
      SELECT 
        COALESCE(SUM(calories), 0) as eaten,
        COALESCE(SUM(protein), 0) as protein,
        COALESCE(SUM(carbs), 0) as carbs,
        COALESCE(SUM(fat), 0) as fat
      FROM meals
      WHERE user_id = ? AND DATE(logged_at) = ?
    `).get(userId, today);

    // Get today's workout calories
    const workouts = db.prepare(`
      SELECT COALESCE(SUM(calories_burned), 0) as burned
      FROM workouts
      WHERE user_id = ? AND DATE(logged_at) = ?
    `).get(userId, today);

    // Get today's water intake
    const water = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM water_intake
      WHERE user_id = ? AND DATE(logged_at) = ?
    `).get(userId, today);

    // Calculate remaining calories
    const remaining = user.calorie_target - nutrition.eaten + workouts.burned;

    res.json({
      user: {
        name: user.name,
        goal: user.goal,
        calorie_target: user.calorie_target,
        weight: user.weight,
        height: user.height
      },
      calories: {
        remaining: remaining,
        eaten: nutrition.eaten,
        burned: workouts.burned,
        target: user.calorie_target
      },
      macros: {
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat
      },
      water: water.total
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
});
