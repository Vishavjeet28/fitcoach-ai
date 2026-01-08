import { query } from '../config/database.js';

// Get user's food logs for a specific date or date range
export const getFoodLogs = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, startDate, endDate } = req.query;

    let result;
    
    if (date) {
      // Get logs for a specific date
      result = await query(
        `SELECT fl.*, f.name as food_name, f.brand, f.category
         FROM food_logs fl
         LEFT JOIN foods f ON fl.food_id = f.id
         WHERE fl.user_id = $1 AND fl.meal_date = $2
         ORDER BY fl.logged_at DESC`,
        [userId, date]
      );
    } else if (startDate && endDate) {
      // Get logs for a date range
      result = await query(
        `SELECT fl.*, f.name as food_name, f.brand, f.category
         FROM food_logs fl
         LEFT JOIN foods f ON fl.food_id = f.id
         WHERE fl.user_id = $1 AND fl.meal_date BETWEEN $2 AND $3
         ORDER BY fl.meal_date DESC, fl.logged_at DESC`,
        [userId, startDate, endDate]
      );
    } else {
      // Get today's logs
      result = await query(
        `SELECT fl.*, f.name as food_name, f.brand, f.category
         FROM food_logs fl
         LEFT JOIN foods f ON fl.food_id = f.id
         WHERE fl.user_id = $1 AND fl.meal_date = CURRENT_DATE
         ORDER BY fl.logged_at DESC`,
        [userId]
      );
    }

    res.json({
      logs: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Get food logs error:', error);
    res.status(500).json({ error: 'Failed to fetch food logs' });
  }
};

// Log a new food entry
export const logFood = async (req, res) => {
  try {
    console.log('Received logFood request body:', JSON.stringify(req.body, null, 2));
    const userId = req.user.id;
    const {
      foodId,
      customFoodName,
      servings = 1.0,
      mealType,
      calories,
      protein,
      carbs,
      fat,
      notes,
      mealDate
    } = req.body;

    // Validation
    if (!foodId && !customFoodName) {
      return res.status(400).json({ error: 'Either foodId or customFoodName is required' });
    }

    if (!mealType) {
      return res.status(400).json({ error: 'Meal type is required' });
    }

    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    if (!validMealTypes.includes(mealType.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid meal type' });
    }

    // If foodId is provided, get nutrition info from database
    let nutritionData = { calories, protein, carbs, fat };
    
    if (foodId) {
      const foodResult = await query(
        'SELECT calories, protein, carbs, fat FROM foods WHERE id = $1',
        [foodId]
      );

      if (foodResult.rows.length === 0) {
        return res.status(404).json({ error: 'Food not found' });
      }

      const food = foodResult.rows[0];
      // Calculate nutrition based on servings
      nutritionData = {
        calories: Math.round(food.calories * servings),
        protein: (food.protein * servings).toFixed(2),
        carbs: (food.carbs * servings).toFixed(2),
        fat: (food.fat * servings).toFixed(2)
      };
    } else if (!calories) {
      return res.status(400).json({ error: 'Calories required for custom food' });
    }

    // Insert food log
    const result = await query(
      `INSERT INTO food_logs (
        user_id, food_id, custom_food_name, servings, meal_type,
        calories, protein, carbs, fat, notes, meal_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        userId,
        foodId || null,
        customFoodName || null,
        servings,
        mealType.toLowerCase(),
        nutritionData.calories,
        nutritionData.protein || 0,
        nutritionData.carbs || 0,
        nutritionData.fat || 0,
        notes || null,
        mealDate || new Date().toISOString().split('T')[0]
      ]
    );

    // Update daily summary
    await updateDailySummary(userId, mealDate || new Date().toISOString().split('T')[0]);

    res.status(201).json({
      message: 'Food logged successfully',
      log: result.rows[0]
    });
  } catch (error) {
    console.error('Log food error:', error);
    res.status(500).json({ error: 'Failed to log food' });
  }
};

// Update a food log
export const updateFoodLog = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { servings, mealType, calories, protein, carbs, fat, notes } = req.body;

    // Check if log exists and belongs to user
    const checkResult = await query(
      'SELECT * FROM food_logs WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Food log not found' });
    }

    const existingLog = checkResult.rows[0];

    // Build update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (servings !== undefined) {
      updates.push(`servings = $${paramCount++}`);
      values.push(servings);
      
      // Recalculate nutrition if servings changed and it's from database
      if (existingLog.food_id) {
        const foodResult = await query(
          'SELECT calories, protein, carbs, fat FROM foods WHERE id = $1',
          [existingLog.food_id]
        );
        
        if (foodResult.rows.length > 0) {
          const food = foodResult.rows[0];
          updates.push(`calories = $${paramCount++}, protein = $${paramCount++}, carbs = $${paramCount++}, fat = $${paramCount++}`);
          values.push(
            Math.round(food.calories * servings),
            (food.protein * servings).toFixed(2),
            (food.carbs * servings).toFixed(2),
            (food.fat * servings).toFixed(2)
          );
        }
      }
    }

    if (mealType !== undefined) {
      updates.push(`meal_type = $${paramCount++}`);
      values.push(mealType.toLowerCase());
    }

    if (calories !== undefined) {
      updates.push(`calories = $${paramCount++}`);
      values.push(calories);
    }

    if (protein !== undefined) {
      updates.push(`protein = $${paramCount++}`);
      values.push(protein);
    }

    if (carbs !== undefined) {
      updates.push(`carbs = $${paramCount++}`);
      values.push(carbs);
    }

    if (fat !== undefined) {
      updates.push(`fat = $${paramCount++}`);
      values.push(fat);
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id, userId);

    const result = await query(
      `UPDATE food_logs SET ${updates.join(', ')}
       WHERE id = $${paramCount++} AND user_id = $${paramCount}
       RETURNING *`,
      values
    );

    // Update daily summary
    await updateDailySummary(userId, existingLog.meal_date);

    res.json({
      message: 'Food log updated successfully',
      log: result.rows[0]
    });
  } catch (error) {
    console.error('Update food log error:', error);
    res.status(500).json({ error: 'Failed to update food log' });
  }
};

// Delete a food log
export const deleteFoodLog = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Check if log exists and belongs to user
    const checkResult = await query(
      'SELECT meal_date FROM food_logs WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Food log not found' });
    }

    const mealDate = checkResult.rows[0].meal_date;

    // Delete the log
    await query(
      'DELETE FROM food_logs WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    // Update daily summary
    await updateDailySummary(userId, mealDate);

    res.json({ message: 'Food log deleted successfully' });
  } catch (error) {
    console.error('Delete food log error:', error);
    res.status(500).json({ error: 'Failed to delete food log' });
  }
};

// Search foods in database
export const searchFoods = async (req, res) => {
  try {
    const { q, category, limit = 20 } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    let queryText = `
      SELECT id, name, brand, serving_size, serving_unit,
             calories, protein, carbs, fat, category
      FROM foods
      WHERE name ILIKE $1
    `;
    const values = [`%${q}%`];

    if (category) {
      queryText += ` AND category = $2`;
      values.push(category);
    }

    queryText += ` ORDER BY is_verified DESC, name ASC LIMIT $${values.length + 1}`;
    values.push(parseInt(limit));

    const result = await query(queryText, values);

    res.json({
      foods: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Search foods error:', error);
    res.status(500).json({ error: 'Failed to search foods' });
  }
};

// Get nutrition totals for a date
export const getNutritionTotals = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const result = await query(
      `SELECT 
        COALESCE(SUM(calories), 0) as total_calories,
        COALESCE(SUM(protein), 0) as total_protein,
        COALESCE(SUM(carbs), 0) as total_carbs,
        COALESCE(SUM(fat), 0) as total_fat,
        COUNT(*) as meal_count
       FROM food_logs
       WHERE user_id = $1 AND meal_date = $2`,
      [userId, targetDate]
    );

    const totals = result.rows[0];

    // Get user's calorie target
    const userResult = await query(
      'SELECT calorie_target FROM users WHERE id = $1',
      [userId]
    );
    const calorieTarget = userResult.rows[0]?.calorie_target || 2000;

    res.json({
      date: targetDate,
      totals: {
        calories: parseInt(totals.total_calories),
        protein: parseFloat(totals.total_protein).toFixed(1),
        carbs: parseFloat(totals.total_carbs).toFixed(1),
        fat: parseFloat(totals.total_fat).toFixed(1),
        mealCount: parseInt(totals.meal_count)
      },
      goals: {
        calories: calorieTarget,
        protein: Math.round(calorieTarget * 0.3 / 4), // 30% of calories from protein
        carbs: Math.round(calorieTarget * 0.4 / 4), // 40% from carbs
        fat: Math.round(calorieTarget * 0.3 / 9) // 30% from fat
      },
      remaining: {
        calories: calorieTarget - parseInt(totals.total_calories)
      }
    });
  } catch (error) {
    console.error('Get nutrition totals error:', error);
    res.status(500).json({ error: 'Failed to get nutrition totals' });
  }
};

// Helper function to update daily summary
async function updateDailySummary(userId, date) {
  try {
    // Calculate totals for the day
    const result = await query(
      `SELECT 
        COALESCE(SUM(calories), 0) as total_calories,
        COALESCE(SUM(protein), 0) as total_protein,
        COALESCE(SUM(carbs), 0) as total_carbs,
        COALESCE(SUM(fat), 0) as total_fat
       FROM food_logs
       WHERE user_id = $1 AND meal_date = $2`,
      [userId, date]
    );

    const totals = result.rows[0];

    // Get user's calorie target
    const userResult = await query(
      'SELECT calorie_target FROM users WHERE id = $1',
      [userId]
    );
    const calorieTarget = userResult.rows[0]?.calorie_target || 2000;

    // Upsert daily summary
    await query(
      `INSERT INTO daily_summaries (
        user_id, summary_date, total_calories, total_protein, 
        total_carbs, total_fat, calorie_target
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, summary_date)
      DO UPDATE SET
        total_calories = $3,
        total_protein = $4,
        total_carbs = $5,
        total_fat = $6,
        calorie_target = $7,
        updated_at = NOW()`,
      [
        userId,
        date,
        totals.total_calories,
        totals.total_protein,
        totals.total_carbs,
        totals.total_fat,
        calorieTarget
      ]
    );
  } catch (error) {
    console.error('Update daily summary error:', error);
  }
}
