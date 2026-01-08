import { query } from '../config/database.js';

// Get user's exercise logs
export const getExerciseLogs = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, startDate, endDate } = req.query;

    let result;
    
    if (date) {
      result = await query(
        `SELECT el.*, e.name as exercise_name, e.category, e.met_value
         FROM exercise_logs el
         LEFT JOIN exercises e ON el.exercise_id = e.id
         WHERE el.user_id = $1 AND el.workout_date = $2
         ORDER BY el.logged_at DESC`,
        [userId, date]
      );
    } else if (startDate && endDate) {
      result = await query(
        `SELECT el.*, e.name as exercise_name, e.category, e.met_value
         FROM exercise_logs el
         LEFT JOIN exercises e ON el.exercise_id = e.id
         WHERE el.user_id = $1 AND el.workout_date BETWEEN $2 AND $3
         ORDER BY el.workout_date DESC, el.logged_at DESC`,
        [userId, startDate, endDate]
      );
    } else {
      result = await query(
        `SELECT el.*, e.name as exercise_name, e.category, e.met_value
         FROM exercise_logs el
         LEFT JOIN exercises e ON el.exercise_id = e.id
         WHERE el.user_id = $1 AND el.workout_date = CURRENT_DATE
         ORDER BY el.logged_at DESC`,
        [userId]
      );
    }

    res.json({
      logs: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Get exercise logs error:', error);
    res.status(500).json({ error: 'Failed to fetch exercise logs' });
  }
};

// Log a new exercise
export const logExercise = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      exerciseId,
      customExerciseName,
      durationMinutes,
      sets,
      reps,
      weightKg,
      distanceKm,
      intensity = 'moderate',
      notes,
      workoutDate
    } = req.body;

    // Validation
    if (!exerciseId && !customExerciseName) {
      return res.status(400).json({ error: 'Either exerciseId or customExerciseName is required' });
    }

    if (!durationMinutes || durationMinutes <= 0) {
      return res.status(400).json({ error: 'Duration in minutes is required' });
    }

    // Calculate calories burned
    let caloriesBurned = 0;
    
    if (exerciseId) {
      const exerciseResult = await query(
        'SELECT met_value FROM exercises WHERE id = $1',
        [exerciseId]
      );

      if (exerciseResult.rows.length === 0) {
        return res.status(404).json({ error: 'Exercise not found' });
      }

      // Get user's weight for calorie calculation
      const userResult = await query(
        'SELECT weight FROM users WHERE id = $1',
        [userId]
      );
      
      const userWeight = userResult.rows[0]?.weight || 70; // Default 70kg
      const metValue = exerciseResult.rows[0].met_value;
      
      // Calories = MET × weight(kg) × time(hours)
      caloriesBurned = Math.round(metValue * userWeight * (durationMinutes / 60));
    } else {
      // Estimate for custom exercise based on intensity
      const userResult = await query(
        'SELECT weight FROM users WHERE id = $1',
        [userId]
      );
      const userWeight = userResult.rows[0]?.weight || 70;
      
      const intensityMET = {
        light: 3.0,
        moderate: 5.0,
        vigorous: 8.0
      };
      
      const met = intensityMET[intensity.toLowerCase()] || 5.0;
      caloriesBurned = Math.round(met * userWeight * (durationMinutes / 60));
    }

    // Insert exercise log
    const result = await query(
      `INSERT INTO exercise_logs (
        user_id, exercise_id, custom_exercise_name, duration_minutes,
        sets, reps, weight_kg, distance_km, calories_burned, intensity,
        notes, workout_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        userId,
        exerciseId || null,
        customExerciseName || null,
        durationMinutes,
        sets || null,
        reps || null,
        weightKg || null,
        distanceKm || null,
        caloriesBurned,
        intensity.toLowerCase(),
        notes || null,
        workoutDate || new Date().toISOString().split('T')[0]
      ]
    );

    // Update daily summary
    await updateDailySummary(userId, workoutDate || new Date().toISOString().split('T')[0]);

    res.status(201).json({
      message: 'Exercise logged successfully',
      log: result.rows[0]
    });
  } catch (error) {
    console.error('Log exercise error:', error);
    res.status(500).json({ error: 'Failed to log exercise' });
  }
};

// Update an exercise log
export const updateExerciseLog = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const {
      durationMinutes,
      sets,
      reps,
      weightKg,
      distanceKm,
      intensity,
      notes
    } = req.body;

    // Check if log exists and belongs to user
    const checkResult = await query(
      'SELECT * FROM exercise_logs WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Exercise log not found' });
    }

    const existingLog = checkResult.rows[0];

    // Build update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    let needsCalorieRecalc = false;

    if (durationMinutes !== undefined) {
      updates.push(`duration_minutes = $${paramCount++}`);
      values.push(durationMinutes);
      needsCalorieRecalc = true;
    }

    if (sets !== undefined) {
      updates.push(`sets = $${paramCount++}`);
      values.push(sets);
    }

    if (reps !== undefined) {
      updates.push(`reps = $${paramCount++}`);
      values.push(reps);
    }

    if (weightKg !== undefined) {
      updates.push(`weight_kg = $${paramCount++}`);
      values.push(weightKg);
    }

    if (distanceKm !== undefined) {
      updates.push(`distance_km = $${paramCount++}`);
      values.push(distanceKm);
    }

    if (intensity !== undefined) {
      updates.push(`intensity = $${paramCount++}`);
      values.push(intensity.toLowerCase());
      needsCalorieRecalc = true;
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(notes);
    }

    // Recalculate calories if duration or intensity changed
    if (needsCalorieRecalc) {
      const newDuration = durationMinutes || existingLog.duration_minutes;
      const newIntensity = intensity || existingLog.intensity;
      
      let caloriesBurned = 0;
      
      if (existingLog.exercise_id) {
        const exerciseResult = await query(
          'SELECT met_value FROM exercises WHERE id = $1',
          [existingLog.exercise_id]
        );
        
        const userResult = await query(
          'SELECT weight FROM users WHERE id = $1',
          [userId]
        );
        
        const userWeight = userResult.rows[0]?.weight || 70;
        const metValue = exerciseResult.rows[0]?.met_value || 5.0;
        caloriesBurned = Math.round(metValue * userWeight * (newDuration / 60));
      } else {
        const userResult = await query(
          'SELECT weight FROM users WHERE id = $1',
          [userId]
        );
        const userWeight = userResult.rows[0]?.weight || 70;
        
        const intensityMET = {
          light: 3.0,
          moderate: 5.0,
          vigorous: 8.0
        };
        
        const met = intensityMET[newIntensity.toLowerCase()] || 5.0;
        caloriesBurned = Math.round(met * userWeight * (newDuration / 60));
      }
      
      updates.push(`calories_burned = $${paramCount++}`);
      values.push(caloriesBurned);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id, userId);

    const result = await query(
      `UPDATE exercise_logs SET ${updates.join(', ')}
       WHERE id = $${paramCount++} AND user_id = $${paramCount}
       RETURNING *`,
      values
    );

    // Update daily summary
    await updateDailySummary(userId, existingLog.workout_date);

    res.json({
      message: 'Exercise log updated successfully',
      log: result.rows[0]
    });
  } catch (error) {
    console.error('Update exercise log error:', error);
    res.status(500).json({ error: 'Failed to update exercise log' });
  }
};

// Delete an exercise log
export const deleteExerciseLog = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Check if log exists and belongs to user
    const checkResult = await query(
      'SELECT workout_date FROM exercise_logs WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Exercise log not found' });
    }

    const workoutDate = checkResult.rows[0].workout_date;

    // Delete the log
    await query(
      'DELETE FROM exercise_logs WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    // Update daily summary
    await updateDailySummary(userId, workoutDate);

    res.json({ message: 'Exercise log deleted successfully' });
  } catch (error) {
    console.error('Delete exercise log error:', error);
    res.status(500).json({ error: 'Failed to delete exercise log' });
  }
};

// Search exercises in database
export const searchExercises = async (req, res) => {
  try {
    const { q, category, limit = 20 } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    let queryText = `
      SELECT id, name, description, category, muscle_groups,
             equipment_needed, difficulty_level, met_value
      FROM exercises
      WHERE name ILIKE $1
    `;
    const values = [`%${q}%`];

    if (category) {
      queryText += ` AND category = $2`;
      values.push(category);
    }

    queryText += ` ORDER BY name ASC LIMIT $${values.length + 1}`;
    values.push(parseInt(limit));

    const result = await query(queryText, values);

    res.json({
      exercises: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Search exercises error:', error);
    res.status(500).json({ error: 'Failed to search exercises' });
  }
};

// Get exercise totals for a date
export const getExerciseTotals = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const result = await query(
      `SELECT 
        COALESCE(SUM(calories_burned), 0) as total_calories,
        COALESCE(SUM(duration_minutes), 0) as total_minutes,
        COUNT(*) as workout_count
       FROM exercise_logs
       WHERE user_id = $1 AND workout_date = $2`,
      [userId, targetDate]
    );

    const totals = result.rows[0];

    res.json({
      date: targetDate,
      totals: {
        caloriesBurned: parseInt(totals.total_calories),
        durationMinutes: parseInt(totals.total_minutes),
        workoutCount: parseInt(totals.workout_count)
      }
    });
  } catch (error) {
    console.error('Get exercise totals error:', error);
    res.status(500).json({ error: 'Failed to get exercise totals' });
  }
};

// Helper function to update daily summary
async function updateDailySummary(userId, date) {
  try {
    // Calculate exercise totals for the day
    const result = await query(
      `SELECT 
        COALESCE(SUM(calories_burned), 0) as total_exercise_calories,
        COALESCE(SUM(duration_minutes), 0) as total_exercise_minutes
       FROM exercise_logs
       WHERE user_id = $1 AND workout_date = $2`,
      [userId, date]
    );

    const totals = result.rows[0];

    // Upsert daily summary (only exercise fields)
    await query(
      `INSERT INTO daily_summaries (
        user_id, summary_date, total_exercise_calories, total_exercise_minutes
      ) VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, summary_date)
      DO UPDATE SET
        total_exercise_calories = $3,
        total_exercise_minutes = $4,
        updated_at = NOW()`,
      [
        userId,
        date,
        totals.total_exercise_calories,
        totals.total_exercise_minutes
      ]
    );
  } catch (error) {
    console.error('Update daily summary error:', error);
  }
}
