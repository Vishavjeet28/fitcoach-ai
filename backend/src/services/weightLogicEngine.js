import { query } from '../config/database.js';

// Constants
const ROLLING_AVG_DAYS = 7;
const PLATEAU_DAYS = 14;
const PLATEAU_THRESHOLD_KG = 0.2;
const FAT_CALORIES_PER_KG = 7700;

class WeightLogicEngine {
  
  /**
   * Calculate 7-day rolling average for the latest window
   * @param {Array} logs - Sorted by date desc
   */
  calculateRollingAverage(logs) {
    if (!logs || logs.length === 0) return null;
    
    // Take last 7 days (or fewer if not enough data)
    const window = logs.slice(0, ROLLING_AVG_DAYS);
    const sum = window.reduce((acc, log) => acc + parseFloat(log.weight_kg), 0);
    return parseFloat((sum / window.length).toFixed(2));
  }

  /**
   * Calculate Trend direction and rate
   * @param {Array} logs 
   */
  calculateTrend(logs) {
    if (!logs || logs.length < 2) return { direction: 'insufficient_data', rate: 0 };

    // Get average of current week
    const currentWeekLogs = logs.filter(l => {
        const d = new Date(l.logged_at);
        const now = new Date();
        return (now - d) / (1000 * 60 * 60 * 24) <= 7;
    });
    
    // Get average of previous week
    const previousWeekLogs = logs.filter(l => {
        const d = new Date(l.logged_at);
        const now = new Date();
        const diffDays = (now - d) / (1000 * 60 * 60 * 24);
        return diffDays > 7 && diffDays <= 14; 
    });

    if (currentWeekLogs.length === 0 || previousWeekLogs.length === 0) {
        // Fallback to simple latest vs oldest if inconsistent data
        // ...
        return { direction: 'insufficient_data', rate: 0 };
    }

    const currentAvg = this.calculateRollingAverage(currentWeekLogs);
    const previousAvg = this.calculateRollingAverage(previousWeekLogs);

    const diff = currentAvg - previousAvg;
    const rate = parseFloat(diff.toFixed(2)); // kg change per week

    let direction = 'stable';
    if (rate <= -0.1) direction = 'losing';
    if (rate >= 0.1) direction = 'gaining';

    return { direction, rate };
  }

  /**
   * Detect plateau based on 14-day history
   * @param {Array} logs - Sorted by date desc
   * @param {String} goal - 'fat_loss', 'muscle_gain', 'maintenance'
   */
  detectPlateau(logs, goal) {
    if (logs.length < PLATEAU_DAYS) return { isPlateau: false };

    // Get logs for the last 14 days
    // We assume logs are passed in, but strictly we should query by date. 
    // For simplicity here, we assume the array passed contains enough history.
    
    const currentWeight = parseFloat(logs[0].weight_kg);
    const twoWeeksAgoWeight = parseFloat(logs[logs.length - 1].weight_kg); // potentially inaccurate if sparse logs
    
    // Better: Get min and max in the 14-day window
    const window = logs.filter(l => {
        const d = new Date(l.logged_at);
        const now = new Date();
        const diffTime = Math.abs(now - d);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= PLATEAU_DAYS;
    });

    if (window.length < 2) return { isPlateau: false };

    const weights = window.map(l => parseFloat(l.weight_kg));
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);
    const fluctuation = maxW - minW;

    // Rule: < 0.2 kg change (fluctuation might be higher due to water, 
    // but the trend line should be flat. 
    // Let's us simple start vs end for now as per prompt "No weight change for 14 days")
    
    const oldest = window[window.length - 1];
    const newest = window[0];
    const change = Math.abs(parseFloat(newest.weight_kg) - parseFloat(oldest.weight_kg));

    if (change < PLATEAU_THRESHOLD_KG && goal === 'fat_loss') {
        return { isPlateau: true, reason: 'no_change' };
    }
    
    // Rebound check (upward trend during fat loss)
    if (goal === 'fat_loss' && (parseFloat(newest.weight_kg) > parseFloat(oldest.weight_kg) + 0.5)) {
         return { isPlateau: true, reason: 'rebound' };
    }

    return { isPlateau: false };
  }

  /**
   * Expected Weekly Change based on Calorie Deficit
   * @param {Number} tdee 
   * @param {Number} intakeTarget 
   */
  calculateExpectedWeeklyChange(tdee, intakeTarget) {
    const dailyDeficit = tdee - intakeTarget;
    // Positive deficit = weight loss (burning more than eating)
    // Wait, usually deficit is TDEE - Intake. 
    // If TDEE 2500, Intake 2000 => Deficit 500. 500 * 7 = 3500. 3500/7700 = ~0.45kg loss.
    
    const weeklyDeficit = dailyDeficit * 7;
    const expectedChangeKg = weeklyDeficit / FAT_CALORIES_PER_KG;
    
    // Result is positive for weight loss (kg to lose)
    // But usually we want projected change. Let's return signed value.
    // -0.5 means lose 0.5. 
    
    // If Intake < TDEE, we lose weight.
    const weeklyDiff = intakeTarget - tdee; // 2000 - 2500 = -500
    const weeklyChange = (weeklyDiff * 7) / FAT_CALORIES_PER_KG;
    
    return parseFloat(weeklyChange.toFixed(2));
  }
}

export default new WeightLogicEngine();
