import { query } from '../config/database.js';
import WLE from './weightLogicEngine.js';

class AnalyticsLogicEngine {

    /**
     * Generate or Update Daily Snapshot for a specific user and date
     * Should be called after any log update (food, weight, exercise)
     */
    async refreshDailySnapshot(userId, dateStr) {
        // dateStr format: YYYY-MM-DD
        
        try {
            console.log(`[ALE] Refreshing daily snapshot for user ${userId} on ${dateStr}`);
            
            // 1. Fetch Weight for the day
            // We want the latest weight logged ON that date
            const weightRes = await query(
                `SELECT weight_kg FROM body_weight_logs 
                 WHERE user_id = $1 AND DATE(logged_at) = $2 
                 ORDER BY logged_at DESC LIMIT 1`,
                [userId, dateStr]
            );
            const weightKg = weightRes.rows[0]?.weight_kg || null;

            // 1b. Calculate Rolling Avg (reuse WLE)
            // Need last 7 days of logs relative to THIS date
            const historyRes = await query(
                `SELECT weight_kg, logged_at FROM body_weight_logs 
                 WHERE user_id = $1 AND logged_at <= $2
                 ORDER BY logged_at DESC LIMIT 30`, 
                [userId, dateStr + ' 23:59:59']
            );
            const rollingAvg = WLE.calculateRollingAverage(historyRes.rows);

            // 2. Fetch Nutrition
            // Sum calories, macros for the date
            const foodRes = await query(
                `SELECT 
                    SUM(calories) as total_cals,
                    SUM(protein_g) as total_pro,
                    SUM(carbs_g) as total_carb,
                    SUM(fat_g) as total_fat
                 FROM food_logs
                 WHERE user_id = $1 AND log_date = $2`,
                [userId, dateStr]
            );
            const foodData = foodRes.rows[0];

            // 3. Fetch Exercise
            const exerciseRes = await query(
                `SELECT 
                    COUNT(*) as count,
                    SUM(calories_burned) as burned
                 FROM exercise_logs
                 WHERE user_id = $1 AND workout_date = $2`,
                [userId, dateStr]
            );
            const exerciseData = exerciseRes.rows[0];

            // 4. Fetch Targets (from user profile or historical if we tracked it)
            // For now, use current user targets
            const userRes = await query(
                `SELECT calorie_target FROM users WHERE id = $1`,
                [userId]
            );
            const calorieTarget = userRes.rows[0]?.calorie_target || 2000;
            
            const totalCals = parseInt(foodData.total_cals || 0);
            // Check adherence (e.g., +/- 10% of target)
            const lower = calorieTarget * 0.9;
            const upper = calorieTarget * 1.1;
            const adherence = totalCals >= lower && totalCals <= upper;

            // 5. Upsert into analytics_daily_snapshots
            await query(
                `INSERT INTO analytics_daily_snapshots 
                (user_id, date, weight_kg, weight_rolling_avg_7d, 
                 total_calories, calorie_target, protein_g, carbs_g, fat_g, 
                 calories_within_range, workout_completed, workout_calories_burned)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (user_id, date) DO UPDATE SET
                 weight_kg = EXCLUDED.weight_kg,
                 weight_rolling_avg_7d = EXCLUDED.weight_rolling_avg_7d,
                 total_calories = EXCLUDED.total_calories,
                 calorie_target = EXCLUDED.calorie_target,
                 protein_g = EXCLUDED.protein_g,
                 carbs_g = EXCLUDED.carbs_g,
                 fat_g = EXCLUDED.fat_g,
                 calories_within_range = EXCLUDED.calories_within_range,
                 workout_completed = EXCLUDED.workout_completed,
                 workout_calories_burned = EXCLUDED.workout_calories_burned;`,
                [
                    userId, dateStr,
                    weightKg, rollingAvg,
                    totalCals, calorieTarget,
                    parseInt(foodData.total_pro || 0),
                    parseInt(foodData.total_carb || 0),
                    parseInt(foodData.total_fat || 0),
                    adherence,
                    parseInt(exerciseData.count) > 0,
                    parseInt(exerciseData.burned || 0)
                ]
            );

            // Trigger Weekly/Monthly update? 
            // Maybe expensive to do every time. 
            // Better to compute aggregates on read or async job. 
            // But strict req says: "Rebuilt when data changes".
            // Let's at least ensure we have methods for it.

        } catch (error) {
            console.error('Error refreshing daily snapshot:', error);
            throw error;
        }
    }

    /**
     * Get Analytics Data for a specific range
     */
    async getDailyHistory(userId, startDate, endDate) {
        const result = await query(
            `SELECT * FROM analytics_daily_snapshots 
             WHERE user_id = $1 AND date >= $2 AND date <= $3 
             ORDER BY date ASC`,
            [userId, startDate, endDate]
        );
        return result.rows;
    }

    /**
     * Backfill history for a user (Expensive!)
     * Call this when user first visits analytics or explicitly requested
     */
    async backfillHistory(userId) {
        // Find earliest log date
        const earliestRes = await query(
            `SELECT MIN(date) as min_date FROM (
                SELECT log_date as date FROM food_logs WHERE user_id = $1
                UNION
                SELECT DATE(logged_at) as date FROM body_weight_logs WHERE user_id = $1
            ) t`,
            [userId]
        );
        
        let currentDate = new Date(earliestRes.rows[0]?.min_date || new Date());
        const now = new Date();
        
        // Limit backfill to 30 days if never run before to avoid timeout
        // Can make this smarter later (e.g., job queue)
        const last30Days = new Date();
        last30Days.setDate(now.getDate() - 30);
        if (currentDate < last30Days) {
            currentDate = last30Days;
        }

        while (currentDate <= now) {
            const dateStr = currentDate.toISOString().split('T')[0];
            await this.refreshDailySnapshot(userId, dateStr);
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    /**
     * ========================================================================
     * ENHANCED ANALYTICS - STRICT ENGINEERING MODE
     * Monthly/Yearly aggregations recalculated from RAW LOGS
     * NEVER average snapshots - always rebuild from source data
     * ========================================================================
     */

    /**
     * Get Weekly Analytics (recalculated from raw logs)
     * @param {number} userId 
     * @param {string} weekStartDate - YYYY-MM-DD format (Monday)
     */
    async getWeeklyAnalytics(userId, weekStartDate) {
        try {
            const weekEndDate = new Date(weekStartDate);
            weekEndDate.setDate(weekEndDate.getDate() + 6);
            const weekEndStr = weekEndDate.toISOString().split('T')[0];

            // Food logs
            const foodRes = await query(
                `SELECT 
                    COUNT(DISTINCT log_date) as days_tracked,
                    AVG(daily.total_calories) as avg_calories,
                    AVG(daily.total_protein) as avg_protein,
                    AVG(daily.total_carbs) as avg_carbs,
                    AVG(daily.total_fat) as avg_fat
                FROM (
                    SELECT 
                        log_date,
                        SUM(calories) as total_calories,
                        SUM(protein_g) as total_protein,
                        SUM(carbs_g) as total_carbs,
                        SUM(fat_g) as total_fat
                    FROM food_logs
                    WHERE user_id = $1 AND log_date >= $2 AND log_date <= $3
                    GROUP BY log_date
                ) daily`,
                [userId, weekStartDate, weekEndStr]
            );

            // Weight logs
            const weightRes = await query(
                `SELECT 
                    AVG(weight_kg) as avg_weight,
                    MIN(weight_kg) as min_weight,
                    MAX(weight_kg) as max_weight
                FROM body_weight_logs
                WHERE user_id = $1 AND DATE(logged_at) >= $2 AND DATE(logged_at) <= $3`,
                [userId, weekStartDate, weekEndStr]
            );

            // Workout logs
            const workoutRes = await query(
                `SELECT 
                    COUNT(*) as workouts_completed,
                    SUM(calories_burned) as total_calories_burned,
                    AVG(duration_minutes) as avg_duration
                FROM workout_sessions
                WHERE user_id = $1 AND session_date >= $2 AND session_date <= $3`,
                [userId, weekStartDate, weekEndStr]
            );

            return {
                period: 'weekly',
                start_date: weekStartDate,
                end_date: weekEndStr,
                nutrition: {
                    days_tracked: parseInt(foodRes.rows[0].days_tracked || 0),
                    avg_calories: parseFloat(foodRes.rows[0].avg_calories || 0).toFixed(0),
                    avg_protein: parseFloat(foodRes.rows[0].avg_protein || 0).toFixed(1),
                    avg_carbs: parseFloat(foodRes.rows[0].avg_carbs || 0).toFixed(1),
                    avg_fat: parseFloat(foodRes.rows[0].avg_fat || 0).toFixed(1),
                },
                weight: {
                    avg: parseFloat(weightRes.rows[0].avg_weight || 0).toFixed(1),
                    min: parseFloat(weightRes.rows[0].min_weight || 0).toFixed(1),
                    max: parseFloat(weightRes.rows[0].max_weight || 0).toFixed(1),
                },
                workouts: {
                    completed: parseInt(workoutRes.rows[0].workouts_completed || 0),
                    total_calories_burned: parseInt(workoutRes.rows[0].total_calories_burned || 0),
                    avg_duration: parseFloat(workoutRes.rows[0].avg_duration || 0).toFixed(0),
                },
            };
        } catch (error) {
            console.error('Error getting weekly analytics:', error);
            throw error;
        }
    }

    /**
     * Get Monthly Analytics (recalculated from raw logs)
     * @param {number} userId 
     * @param {number} year 
     * @param {number} month - 1-12
     */
    async getMonthlyAnalytics(userId, year, month) {
        try {
            const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
            const nextMonth = month === 12 ? 1 : month + 1;
            const nextYear = month === 12 ? year + 1 : year;
            const monthEnd = new Date(nextYear, nextMonth - 1, 0).toISOString().split('T')[0];

            // Food logs - daily aggregation first, then monthly average
            const foodRes = await query(
                `SELECT 
                    COUNT(DISTINCT log_date) as days_tracked,
                    AVG(daily.total_calories) as avg_calories,
                    AVG(daily.total_protein) as avg_protein,
                    AVG(daily.total_carbs) as avg_carbs,
                    AVG(daily.total_fat) as avg_fat,
                    SUM(daily.total_calories) as total_calories_month
                FROM (
                    SELECT 
                        log_date,
                        SUM(calories) as total_calories,
                        SUM(protein_g) as total_protein,
                        SUM(carbs_g) as total_carbs,
                        SUM(fat_g) as total_fat
                    FROM food_logs
                    WHERE user_id = $1 AND log_date >= $2 AND log_date <= $3
                    GROUP BY log_date
                ) daily`,
                [userId, monthStart, monthEnd]
            );

            // Weight logs - weekly averages
            const weightRes = await query(
                `SELECT 
                    DATE_TRUNC('week', DATE(logged_at)) as week,
                    AVG(weight_kg) as avg_weight
                FROM body_weight_logs
                WHERE user_id = $1 AND DATE(logged_at) >= $2 AND DATE(logged_at) <= $3
                GROUP BY week
                ORDER BY week`,
                [userId, monthStart, monthEnd]
            );

            // Calculate weight change
            let weightChange = 0;
            if (weightRes.rows.length >= 2) {
                const firstWeek = parseFloat(weightRes.rows[0].avg_weight);
                const lastWeek = parseFloat(weightRes.rows[weightRes.rows.length - 1].avg_weight);
                weightChange = lastWeek - firstWeek;
            }

            // Workout logs
            const workoutRes = await query(
                `SELECT 
                    COUNT(*) as workouts_completed,
                    SUM(calories_burned) as total_calories_burned,
                    AVG(duration_minutes) as avg_duration,
                    COUNT(*) * 100.0 / NULLIF((
                        SELECT frequency FROM workout_programs 
                        WHERE user_id = $1 AND is_active = true LIMIT 1
                    ) * 4, 0) as adherence_rate
                FROM workout_sessions
                WHERE user_id = $1 AND session_date >= $2 AND session_date <= $3`,
                [userId, monthStart, monthEnd]
            );

            // Macro adherence (days within target)
            const adherenceRes = await query(
                `SELECT 
                    COUNT(CASE WHEN ABS(daily_calories - target_calories) <= target_calories * 0.1 THEN 1 END) * 100.0 / COUNT(*) as adherence_pct
                FROM (
                    SELECT 
                        log_date,
                        SUM(calories) as daily_calories,
                        (SELECT calorie_target FROM users WHERE id = $1) as target_calories
                    FROM food_logs
                    WHERE user_id = $1 AND log_date >= $2 AND log_date <= $3
                    GROUP BY log_date
                ) daily_totals`,
                [userId, monthStart, monthEnd]
            );

            return {
                period: 'monthly',
                year,
                month,
                start_date: monthStart,
                end_date: monthEnd,
                nutrition: {
                    days_tracked: parseInt(foodRes.rows[0].days_tracked || 0),
                    avg_daily_calories: parseFloat(foodRes.rows[0].avg_calories || 0).toFixed(0),
                    avg_protein: parseFloat(foodRes.rows[0].avg_protein || 0).toFixed(1),
                    avg_carbs: parseFloat(foodRes.rows[0].avg_carbs || 0).toFixed(1),
                    avg_fat: parseFloat(foodRes.rows[0].avg_fat || 0).toFixed(1),
                    total_calories_month: parseInt(foodRes.rows[0].total_calories_month || 0),
                    adherence_rate: parseFloat(adherenceRes.rows[0].adherence_pct || 0).toFixed(1),
                },
                weight: {
                    weekly_averages: weightRes.rows.map(r => ({
                        week: r.week,
                        avg: parseFloat(r.avg_weight).toFixed(1),
                    })),
                    change_kg: parseFloat(weightChange).toFixed(2),
                },
                workouts: {
                    completed: parseInt(workoutRes.rows[0].workouts_completed || 0),
                    total_calories_burned: parseInt(workoutRes.rows[0].total_calories_burned || 0),
                    avg_duration: parseFloat(workoutRes.rows[0].avg_duration || 0).toFixed(0),
                    adherence_rate: parseFloat(workoutRes.rows[0].adherence_rate || 0).toFixed(1),
                },
            };
        } catch (error) {
            console.error('Error getting monthly analytics:', error);
            throw error;
        }
    }

    /**
     * Get Yearly Analytics (recalculated from raw logs)
     * @param {number} userId 
     * @param {number} year
     */
    async getYearlyAnalytics(userId, year) {
        try {
            const yearStart = `${year}-01-01`;
            const yearEnd = `${year}-12-31`;

            // Monthly breakdowns
            const monthlyData = [];
            for (let month = 1; month <= 12; month++) {
                const data = await this.getMonthlyAnalytics(userId, year, month);
                monthlyData.push(data);
            }

            // Yearly totals
            const foodRes = await query(
                `SELECT 
                    COUNT(DISTINCT log_date) as days_tracked,
                    SUM(daily.total_calories) as total_calories_year
                FROM (
                    SELECT 
                        log_date,
                        SUM(calories) as total_calories
                    FROM food_logs
                    WHERE user_id = $1 AND log_date >= $2 AND log_date <= $3
                    GROUP BY log_date
                ) daily`,
                [userId, yearStart, yearEnd]
            );

            const workoutRes = await query(
                `SELECT 
                    COUNT(*) as total_workouts,
                    SUM(calories_burned) as total_calories_burned,
                    SUM(duration_minutes) as total_minutes
                FROM workout_sessions
                WHERE user_id = $1 AND session_date >= $2 AND session_date <= $3`,
                [userId, yearStart, yearEnd]
            );

            // Weight change (first vs last week average)
            const weightRes = await query(
                `SELECT 
                    (SELECT AVG(weight_kg) FROM body_weight_logs 
                     WHERE user_id = $1 AND DATE(logged_at) >= $2 AND DATE(logged_at) < $2::date + 7
                    ) as year_start_weight,
                    (SELECT AVG(weight_kg) FROM body_weight_logs 
                     WHERE user_id = $1 AND DATE(logged_at) <= $3 AND DATE(logged_at) > $3::date - 7
                    ) as year_end_weight`,
                [userId, yearStart, yearEnd]
            );

            const startWeight = parseFloat(weightRes.rows[0]?.year_start_weight || 0);
            const endWeight = parseFloat(weightRes.rows[0]?.year_end_weight || 0);
            const weightChange = endWeight - startWeight;

            return {
                period: 'yearly',
                year,
                start_date: yearStart,
                end_date: yearEnd,
                summary: {
                    days_tracked: parseInt(foodRes.rows[0].days_tracked || 0),
                    total_calories: parseInt(foodRes.rows[0].total_calories_year || 0),
                    total_workouts: parseInt(workoutRes.rows[0].total_workouts || 0),
                    total_calories_burned: parseInt(workoutRes.rows[0].total_calories_burned || 0),
                    total_workout_minutes: parseInt(workoutRes.rows[0].total_minutes || 0),
                    weight_change_kg: parseFloat(weightChange).toFixed(2),
                },
                monthly_breakdown: monthlyData,
            };
        } catch (error) {
            console.error('Error getting yearly analytics:', error);
            throw error;
        }
    }

    /**
     * Get comparison analytics (current vs previous period)
     * @param {number} userId 
     * @param {string} period - 'week', 'month', 'year'
     * @param {string} currentDate - YYYY-MM-DD
     */
    async getComparisonAnalytics(userId, period, currentDate) {
        try {
            let currentData, previousData;
            const current = new Date(currentDate);

            if (period === 'week') {
                // Get Monday of current week
                const dayOfWeek = current.getDay();
                const diff = current.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
                const monday = new Date(current.setDate(diff));
                const mondayStr = monday.toISOString().split('T')[0];

                currentData = await this.getWeeklyAnalytics(userId, mondayStr);

                // Previous week
                const prevMonday = new Date(monday);
                prevMonday.setDate(prevMonday.getDate() - 7);
                previousData = await this.getWeeklyAnalytics(userId, prevMonday.toISOString().split('T')[0]);

            } else if (period === 'month') {
                const year = current.getFullYear();
                const month = current.getMonth() + 1;

                currentData = await this.getMonthlyAnalytics(userId, year, month);

                const prevMonth = month === 1 ? 12 : month - 1;
                const prevYear = month === 1 ? year - 1 : year;
                previousData = await this.getMonthlyAnalytics(userId, prevYear, prevMonth);

            } else if (period === 'year') {
                const year = current.getFullYear();
                currentData = await this.getYearlyAnalytics(userId, year);
                previousData = await this.getYearlyAnalytics(userId, year - 1);
            }

            return {
                current: currentData,
                previous: previousData,
                comparison: this._calculateComparison(currentData, previousData),
            };
        } catch (error) {
            console.error('Error getting comparison analytics:', error);
            throw error;
        }
    }

    /**
     * Calculate percentage changes between periods
     */
    _calculateComparison(current, previous) {
        const calcChange = (curr, prev) => {
            if (!prev || prev === 0) return null;
            return (((curr - prev) / prev) * 100).toFixed(1);
        };

        return {
            calories_change_pct: calcChange(
                parseFloat(current.nutrition?.avg_daily_calories || current.nutrition?.avg_calories),
                parseFloat(previous.nutrition?.avg_daily_calories || previous.nutrition?.avg_calories)
            ),
            weight_change_pct: calcChange(
                parseFloat(current.weight?.avg || current.weight?.weekly_averages?.[current.weight.weekly_averages.length - 1]?.avg),
                parseFloat(previous.weight?.avg || previous.weight?.weekly_averages?.[previous.weight.weekly_averages.length - 1]?.avg)
            ),
            workouts_change_pct: calcChange(
                current.workouts?.completed,
                previous.workouts?.completed
            ),
        };
    }
}

export default new AnalyticsLogicEngine();
