import { query } from '../config/database.js';

// Get daily summary
export const getDailySummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const result = await query(
      `SELECT * FROM daily_summaries
       WHERE user_id = $1 AND summary_date = $2`,
      [userId, targetDate]
    );

    if (result.rows.length === 0) {
      // Return empty summary if no data
      return res.json({
        date: targetDate,
        summary: {
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0,
          totalExerciseCalories: 0,
          totalExerciseMinutes: 0,
          totalWaterMl: 0,
          calorieTarget: 2000,
          waterTargetMl: 3000
        }
      });
    }

    const summary = result.rows[0];

    res.json({
      date: targetDate,
      summary: {
        totalCalories: parseInt(summary.total_calories || 0),
        totalProtein: parseFloat(summary.total_protein || 0),
        totalCarbs: parseFloat(summary.total_carbs || 0),
        totalFat: parseFloat(summary.total_fat || 0),
        totalExerciseCalories: parseInt(summary.total_exercise_calories || 0),
        totalExerciseMinutes: parseInt(summary.total_exercise_minutes || 0),
        totalWaterMl: parseInt(summary.total_water_ml || 0),
        calorieTarget: parseInt(summary.calorie_target || 2000),
        waterTargetMl: parseInt(summary.water_target_ml || 3000),
        netCalories: parseInt(summary.total_calories || 0) - parseInt(summary.total_exercise_calories || 0)
      }
    });
  } catch (error) {
    console.error('Get daily summary error:', error);
    res.status(500).json({ error: 'Failed to get daily summary' });
  }
};

// Get weekly trends
export const getWeeklyTrends = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate } = req.query;
    
    let start;
    if (startDate) {
      start = new Date(startDate);
    } else {
      start = new Date();
      start.setDate(start.getDate() - 6); // Last 7 days
    }
    
    const startDateStr = start.toISOString().split('T')[0];

    const result = await query(
      `SELECT 
        summary_date,
        total_calories,
        total_protein,
        total_carbs,
        total_fat,
        total_exercise_calories,
        total_exercise_minutes,
        total_water_ml,
        calorie_target,
        water_target_ml
       FROM daily_summaries
       WHERE user_id = $1 
         AND summary_date >= $2
         AND summary_date <= CURRENT_DATE
       ORDER BY summary_date ASC`,
      [userId, startDateStr]
    );

    // Calculate averages
    const data = result.rows;
    const count = data.length;
    
    let avgCalories = 0, avgProtein = 0, avgCarbs = 0, avgFat = 0;
    let avgExerciseCalories = 0, avgExerciseMinutes = 0, avgWater = 0;
    
    if (count > 0) {
      data.forEach(row => {
        avgCalories += parseInt(row.total_calories || 0);
        avgProtein += parseFloat(row.total_protein || 0);
        avgCarbs += parseFloat(row.total_carbs || 0);
        avgFat += parseFloat(row.total_fat || 0);
        avgExerciseCalories += parseInt(row.total_exercise_calories || 0);
        avgExerciseMinutes += parseInt(row.total_exercise_minutes || 0);
        avgWater += parseInt(row.total_water_ml || 0);
      });
      
      avgCalories = Math.round(avgCalories / count);
      avgProtein = (avgProtein / count).toFixed(1);
      avgCarbs = (avgCarbs / count).toFixed(1);
      avgFat = (avgFat / count).toFixed(1);
      avgExerciseCalories = Math.round(avgExerciseCalories / count);
      avgExerciseMinutes = Math.round(avgExerciseMinutes / count);
      avgWater = Math.round(avgWater / count);
    }

    res.json({
      startDate: startDateStr,
      endDate: new Date().toISOString().split('T')[0],
      days: count,
      dailyData: data.map(row => ({
        date: row.summary_date,
        calories: parseInt(row.total_calories || 0),
        protein: parseFloat(row.total_protein || 0),
        carbs: parseFloat(row.total_carbs || 0),
        fat: parseFloat(row.total_fat || 0),
        exerciseCalories: parseInt(row.total_exercise_calories || 0),
        exerciseMinutes: parseInt(row.total_exercise_minutes || 0),
        waterMl: parseInt(row.total_water_ml || 0),
        calorieTarget: parseInt(row.calorie_target || 2000),
        netCalories: parseInt(row.total_calories || 0) - parseInt(row.total_exercise_calories || 0)
      })),
      averages: {
        calories: avgCalories,
        protein: parseFloat(avgProtein),
        carbs: parseFloat(avgCarbs),
        fat: parseFloat(avgFat),
        exerciseCalories: avgExerciseCalories,
        exerciseMinutes: avgExerciseMinutes,
        waterMl: avgWater
      }
    });
  } catch (error) {
    console.error('Get weekly trends error:', error);
    res.status(500).json({ error: 'Failed to get weekly trends' });
  }
};

// Get monthly stats
export const getMonthlyStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { year, month } = req.query;
    
    const targetYear = year || new Date().getFullYear();
    const targetMonth = month || new Date().getMonth() + 1;
    
    const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0];

    const result = await query(
      `SELECT 
        summary_date,
        total_calories,
        total_protein,
        total_carbs,
        total_fat,
        total_exercise_calories,
        total_exercise_minutes,
        total_water_ml,
        calorie_target
       FROM daily_summaries
       WHERE user_id = $1 
         AND summary_date BETWEEN $2 AND $3
       ORDER BY summary_date ASC`,
      [userId, startDate, endDate]
    );

    const data = result.rows;
    const daysLogged = data.length;
    
    // Calculate totals and averages
    let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;
    let totalExerciseCalories = 0, totalExerciseMinutes = 0, totalWater = 0;
    let daysMetCalorieGoal = 0, daysMetWaterGoal = 0, daysExercised = 0;
    
    data.forEach(row => {
      const calories = parseInt(row.total_calories || 0);
      const exerciseMinutes = parseInt(row.total_exercise_minutes || 0);
      const water = parseInt(row.total_water_ml || 0);
      const calorieTarget = parseInt(row.calorie_target || 2000);
      
      totalCalories += calories;
      totalProtein += parseFloat(row.total_protein || 0);
      totalCarbs += parseFloat(row.total_carbs || 0);
      totalFat += parseFloat(row.total_fat || 0);
      totalExerciseCalories += parseInt(row.total_exercise_calories || 0);
      totalExerciseMinutes += exerciseMinutes;
      totalWater += water;
      
      if (calories <= calorieTarget * 1.1 && calories >= calorieTarget * 0.9) {
        daysMetCalorieGoal++;
      }
      if (water >= 2500) { // At least 2.5L
        daysMetWaterGoal++;
      }
      if (exerciseMinutes >= 20) {
        daysExercised++;
      }
    });

    res.json({
      year: parseInt(targetYear),
      month: parseInt(targetMonth),
      startDate,
      endDate,
      daysLogged,
      totals: {
        calories: totalCalories,
        protein: totalProtein.toFixed(1),
        carbs: totalCarbs.toFixed(1),
        fat: totalFat.toFixed(1),
        exerciseCalories: totalExerciseCalories,
        exerciseMinutes: totalExerciseMinutes,
        waterMl: totalWater
      },
      averages: daysLogged > 0 ? {
        calories: Math.round(totalCalories / daysLogged),
        protein: (totalProtein / daysLogged).toFixed(1),
        carbs: (totalCarbs / daysLogged).toFixed(1),
        fat: (totalFat / daysLogged).toFixed(1),
        exerciseCalories: Math.round(totalExerciseCalories / daysLogged),
        exerciseMinutes: Math.round(totalExerciseMinutes / daysLogged),
        waterMl: Math.round(totalWater / daysLogged)
      } : null,
      achievements: {
        daysMetCalorieGoal,
        daysMetWaterGoal,
        daysExercised,
        consistency: daysLogged > 0 ? Math.round((daysLogged / 30) * 100) : 0
      },
      dailyData: data.map(row => ({
        date: row.summary_date,
        calories: parseInt(row.total_calories || 0),
        exerciseMinutes: parseInt(row.total_exercise_minutes || 0),
        waterMl: parseInt(row.total_water_ml || 0)
      }))
    });
  } catch (error) {
    console.error('Get monthly stats error:', error);
    res.status(500).json({ error: 'Failed to get monthly stats' });
  }
};

// Get progress overview
export const getProgressOverview = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's start weight and current weight
    const userResult = await query(
      'SELECT weight, calorie_target, goal, created_at FROM users WHERE id = $1',
      [userId]
    );
    
    const user = userResult.rows[0];
    
    // Get weight history (we'll need to add a weight_logs table for this, for now use current weight)
    const currentWeight = user.weight;
    
    // Get total days logged
    const daysResult = await query(
      `SELECT COUNT(DISTINCT summary_date) as days_logged
       FROM daily_summaries
       WHERE user_id = $1`,
      [userId]
    );
    
    const daysLogged = parseInt(daysResult.rows[0].days_logged);
    
    // Get total stats
    const statsResult = await query(
      `SELECT 
        SUM(total_exercise_calories) as total_calories_burned,
        SUM(total_exercise_minutes) as total_exercise_minutes,
        AVG(total_water_ml) as avg_water_ml
       FROM daily_summaries
       WHERE user_id = $1`,
      [userId]
    );
    
    const stats = statsResult.rows[0];
    
    // Get recent streak
    const streakResult = await query(
      `SELECT summary_date
       FROM daily_summaries
       WHERE user_id = $1
         AND summary_date >= CURRENT_DATE - INTERVAL '30 days'
       ORDER BY summary_date DESC`,
      [userId]
    );
    
    let currentStreak = 0;
    const dates = streakResult.rows.map(r => new Date(r.summary_date));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < dates.length; i++) {
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);
      
      const actualDate = new Date(dates[i]);
      actualDate.setHours(0, 0, 0, 0);
      
      if (actualDate.getTime() === expectedDate.getTime()) {
        currentStreak++;
      } else {
        break;
      }
    }

    res.json({
      daysLogged,
      currentStreak,
      weight: {
        current: currentWeight,
        goal: user.goal
      },
      totals: {
        caloriesBurned: parseInt(stats.total_calories_burned || 0),
        exerciseMinutes: parseInt(stats.total_exercise_minutes || 0)
      },
      averages: {
        waterMl: Math.round(stats.avg_water_ml || 0)
      },
      memberSince: user.created_at
    });
  } catch (error) {
    console.error('Get progress overview error:', error);
    res.status(500).json({ error: 'Failed to get progress overview' });
  }
};
