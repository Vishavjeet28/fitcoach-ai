/**
 * Tips Controller
 * Manages daily motivational/educational tips
 */

import { query } from '../config/database.js';

// Curated tips library (AI-generated once, stored here)
const TIPS_LIBRARY = [
    // Nutrition tips
    { content: "Protein at breakfast helps maintain satiety throughout the day.", category: "nutrition" },
    { content: "Drinking water before meals can help with portion control.", category: "nutrition" },
    { content: "Fiber-rich foods keep you full longer and support gut health.", category: "nutrition" },
    { content: "Eating slowly allows your brain to register fullness signals.", category: "nutrition" },
    { content: "Colorful plates often mean more nutrients and antioxidants.", category: "nutrition" },
    { content: "Protein helps preserve muscle mass during weight loss.", category: "nutrition" },
    { content: "Complex carbs provide steady energy throughout the day.", category: "nutrition" },
    { content: "Healthy fats are essential for hormone production and brain health.", category: "nutrition" },

    // Motivation tips
    { content: "Progress isn't always linear. Trust the process.", category: "motivation" },
    { content: "Small consistent actions beat occasional perfection.", category: "motivation" },
    { content: "Every meal is a new opportunity to nourish your body.", category: "motivation" },
    { content: "You're not starting over, you're starting from experience.", category: "motivation" },
    { content: "Focus on how you feel, not just what the scale says.", category: "motivation" },
    { content: "Celebrate the small wins - they add up to big changes.", category: "motivation" },
    { content: "Your only competition is the person you were yesterday.", category: "motivation" },
    { content: "Rest days are productive days for muscle recovery.", category: "motivation" },

    // Workout tips
    { content: "Compound exercises like squats work multiple muscle groups efficiently.", category: "workout" },
    { content: "Progressive overload is key: gradually increase weight or reps.", category: "workout" },
    { content: "Proper form prevents injury and maximizes muscle engagement.", category: "workout" },
    { content: "Sleep is when your muscles actually grow and recover.", category: "workout" },
    { content: "Warming up increases blood flow and prevents injuries.", category: "workout" },
    { content: "Mix cardio and strength training for optimal fitness.", category: "workout" },

    // Recovery tips
    { content: "7-9 hours of sleep optimizes recovery and hormone balance.", category: "recovery" },
    { content: "Stretching after workouts improves flexibility and reduces soreness.", category: "recovery" },
    { content: "Hydration affects performance, recovery, and metabolism.", category: "recovery" },
    { content: "Active recovery like walking helps reduce muscle stiffness.", category: "recovery" },

    // Mindset tips
    { content: "Logging meals creates awareness, not restriction.", category: "mindset" },
    { content: "One off-track meal doesn't undo weeks of progress.", category: "mindset" },
    { content: "Sustainable habits beat aggressive diets every time.", category: "mindset" },
    { content: "Listen to your hunger cues - they're valuable signals.", category: "mindset" }
];

// Get daily tip for user
export const getDailyTip = async (req, res) => {
    try {
        const userId = req.user.id;
        const today = new Date().toISOString().split('T')[0];

        // Check if tip already exists for today
        const existingTip = await query(
            `SELECT id, tip_content, tip_category, was_shown
       FROM daily_tips
       WHERE user_id = $1 AND tip_date = $2`,
            [userId, today]
        );

        if (existingTip.rows.length > 0) {
            // Mark as shown
            if (!existingTip.rows[0].was_shown) {
                await query(
                    `UPDATE daily_tips SET was_shown = TRUE WHERE id = $1`,
                    [existingTip.rows[0].id]
                );
            }

            return res.json({
                success: true,
                data: {
                    tip: existingTip.rows[0].tip_content,
                    category: existingTip.rows[0].tip_category
                }
            });
        }

        // Generate new tip for today
        const tip = await generateDailyTip(userId, today);

        return res.json({
            success: true,
            data: tip
        });
    } catch (error) {
        console.error('Get daily tip error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch tip' });
    }
};

// Generate a new daily tip
async function generateDailyTip(userId, date) {
    // Get user's recent tips to avoid repetition
    const recentTips = await query(
        `SELECT tip_content FROM daily_tips 
     WHERE user_id = $1 AND tip_date > $2 - INTERVAL '7 days'`,
        [userId, date]
    );

    const recentContents = recentTips.rows.map(r => r.tip_content);

    // Filter out recently shown tips
    const availableTips = TIPS_LIBRARY.filter(t => !recentContents.includes(t.content));

    // Select random tip (or cycle back if all shown)
    const tipPool = availableTips.length > 0 ? availableTips : TIPS_LIBRARY;
    const randomTip = tipPool[Math.floor(Math.random() * tipPool.length)];

    // Save to database
    await query(
        `INSERT INTO daily_tips (user_id, tip_date, tip_content, tip_category, source, was_shown)
     VALUES ($1, $2, $3, $4, 'curated', TRUE)
     ON CONFLICT (user_id, tip_date) DO UPDATE SET tip_content = $3, tip_category = $4`,
        [userId, date, randomTip.content, randomTip.category]
    );

    return {
        tip: randomTip.content,
        category: randomTip.category
    };
}

// Get tip history (for analytics/debugging)
export const getTipHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const days = parseInt(req.query.days) || 7;

        const result = await query(
            `SELECT tip_date, tip_content, tip_category
       FROM daily_tips
       WHERE user_id = $1
       ORDER BY tip_date DESC
       LIMIT $2`,
            [userId, days]
        );

        return res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get tip history error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch tip history' });
    }
};

export default {
    getDailyTip,
    getTipHistory
};
