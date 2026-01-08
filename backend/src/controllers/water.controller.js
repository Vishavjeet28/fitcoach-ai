import { query } from '../config/database.js';

// Get water logs
export const getWaterLogs = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, startDate, endDate } = req.query;

    let result;
    
    if (date) {
      result = await query(
        `SELECT * FROM water_logs
         WHERE user_id = $1 AND log_date = $2
         ORDER BY logged_at DESC`,
        [userId, date]
      );
    } else if (startDate && endDate) {
      result = await query(
        `SELECT * FROM water_logs
         WHERE user_id = $1 AND log_date BETWEEN $2 AND $3
         ORDER BY log_date DESC, logged_at DESC`,
        [userId, startDate, endDate]
      );
    } else {
      result = await query(
        `SELECT * FROM water_logs
         WHERE user_id = $1 AND log_date = CURRENT_DATE
         ORDER BY logged_at DESC`,
        [userId]
      );
    }

    res.json({
      logs: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Get water logs error:', error);
    res.status(500).json({ error: 'Failed to fetch water logs' });
  }
};

// Log water intake
export const logWater = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amountMl, logDate } = req.body;

    if (!amountMl || amountMl <= 0) {
      return res.status(400).json({ error: 'Amount in ml is required and must be positive' });
    }

    const targetDate = logDate || new Date().toISOString().split('T')[0];

    // Insert water log
    const result = await query(
      `INSERT INTO water_logs (user_id, amount_ml, log_date)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, amountMl, targetDate]
    );

    // Update daily summary
    await updateDailySummary(userId, targetDate);

    res.status(201).json({
      message: 'Water intake logged successfully',
      log: result.rows[0]
    });
  } catch (error) {
    console.error('Log water error:', error);
    res.status(500).json({ error: 'Failed to log water intake' });
  }
};

// Delete a water log
export const deleteWaterLog = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Check if log exists and belongs to user
    const checkResult = await query(
      'SELECT log_date FROM water_logs WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Water log not found' });
    }

    const logDate = checkResult.rows[0].log_date;

    // Delete the log
    await query(
      'DELETE FROM water_logs WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    // Update daily summary
    await updateDailySummary(userId, logDate);

    res.json({ message: 'Water log deleted successfully' });
  } catch (error) {
    console.error('Delete water log error:', error);
    res.status(500).json({ error: 'Failed to delete water log' });
  }
};

// Get water totals for a date
export const getWaterTotals = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const result = await query(
      `SELECT 
        COALESCE(SUM(amount_ml), 0) as total_ml,
        COUNT(*) as log_count
       FROM water_logs
       WHERE user_id = $1 AND log_date = $2`,
      [userId, targetDate]
    );

    const totals = result.rows[0];
    const goalMl = 3000; // Default 3L goal

    res.json({
      date: targetDate,
      totals: {
        amountMl: parseInt(totals.total_ml),
        logCount: parseInt(totals.log_count)
      },
      goal: {
        amountMl: goalMl
      },
      remaining: {
        amountMl: Math.max(0, goalMl - parseInt(totals.total_ml))
      },
      progress: {
        percentage: Math.min(100, Math.round((parseInt(totals.total_ml) / goalMl) * 100))
      }
    });
  } catch (error) {
    console.error('Get water totals error:', error);
    res.status(500).json({ error: 'Failed to get water totals' });
  }
};

// Get water history (last 7 days)
export const getWaterHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 7 } = req.query;

    const result = await query(
      `SELECT 
        log_date,
        SUM(amount_ml) as total_ml,
        COUNT(*) as log_count
       FROM water_logs
       WHERE user_id = $1 
         AND log_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
       GROUP BY log_date
       ORDER BY log_date DESC`,
      [userId]
    );

    res.json({
      history: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Get water history error:', error);
    res.status(500).json({ error: 'Failed to get water history' });
  }
};

// Helper function to update daily summary
async function updateDailySummary(userId, date) {
  try {
    // Calculate water total for the day
    const result = await query(
      `SELECT COALESCE(SUM(amount_ml), 0) as total_water_ml
       FROM water_logs
       WHERE user_id = $1 AND log_date = $2`,
      [userId, date]
    );

    const totalWaterMl = result.rows[0].total_water_ml;

    // Upsert daily summary (only water field)
    await query(
      `INSERT INTO daily_summaries (
        user_id, summary_date, total_water_ml, water_target_ml
      ) VALUES ($1, $2, $3, 3000)
      ON CONFLICT (user_id, summary_date)
      DO UPDATE SET
        total_water_ml = $3,
        water_target_ml = 3000,
        updated_at = NOW()`,
      [userId, date, totalWaterMl]
    );
  } catch (error) {
    console.error('Update daily summary error:', error);
  }
}
