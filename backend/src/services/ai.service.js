import { getAIProvider } from './ai/ai.provider.js';

const safeJsonFromText = (text) => {
  const jsonMatch = String(text || '').match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  return JSON.parse(jsonMatch[0]);
};

// This service is provider-agnostic.
// Controllers call these methods; the provider can be switched by env vars.

export const getMealSuggestions = async (userProfile, preferences = {}) => {
  try {
    const provider = getAIProvider();

    const { calorieTarget, goal, dietaryRestrictions = [], preferredCuisines = [] } = preferences;

    const prompt = `You are a professional nutritionist AI assistant. Generate 3 healthy meal suggestions for a user with the following profile:

User Profile:
- Daily calorie target: ${calorieTarget || userProfile.calorieTarget || 2000} calories
- Goal: ${goal || userProfile.goal || 'maintain weight'}
- Dietary restrictions: ${dietaryRestrictions.length > 0 ? dietaryRestrictions.join(', ') : 'none'}
- Preferred cuisines: ${preferredCuisines.length > 0 ? preferredCuisines.join(', ') : 'any'}

Please provide:
1. Breakfast suggestion (around 25% of daily calories)
2. Lunch suggestion (around 35% of daily calories)
3. Dinner suggestion (around 30% of daily calories)

For each meal, include:
- Meal name
- Brief description
- Estimated calories
- Protein, carbs, and fat content (in grams)
- Key ingredients
- Quick preparation tips

Format your response as JSON with this structure:
{
  "meals": [
    {
      "type": "breakfast",
      "name": "...",
      "description": "...",
      "calories": 500,
      "protein": 25,
      "carbs": 60,
      "fat": 15,
      "ingredients": ["...", "..."],
      "tips": "..."
    }
  ]
}`;

    const text = await provider.generateText(prompt);
    const parsed = safeJsonFromText(text);
    return parsed || { text, raw: true };
  } catch (error) {
    console.error('AI API error:', error);
    throw new Error('Failed to generate meal suggestions');
  }
};

export const recognizeFood = async (description) => {
  try {
    const provider = getAIProvider();

    const prompt = `You are a nutrition expert. The user described the following food: "${description}"

Analyze this description and provide nutritional information. If it's a common food, provide accurate nutrition data. If it's unclear, make your best estimate.

Format your response as JSON:
{
  "foodName": "standardized food name",
  "confidence": "high/medium/low",
  "servingSize": "1 serving",
  "calories": 200,
  "protein": 10,
  "carbs": 25,
  "fat": 8,
  "suggestions": "any clarifying questions or serving size adjustments"
}`;

    const text = await provider.generateText(prompt);
    const parsed = safeJsonFromText(text);
    return parsed || { text, raw: true };
  } catch (error) {
    console.error('AI API error:', error);
    throw new Error('Failed to recognize food');
  }
};

export const getPersonalizedInsights = async (userData) => {
  try {
    const provider = getAIProvider();

    const {
      calorieIntake,
      calorieTarget,
      exerciseMinutes,
      waterIntake,
      goal,
      recentTrend,
      // New FLE context fields
      netCalories,
      proteinGap,
      carbGap,
      fatGap,
      weightTrend,
      complianceScore,
      status
    } = userData;

    // Build comprehensive context for AI
    const fleContext = netCalories !== undefined ? `
FLE Analysis:
- Net Calories: ${netCalories} (Eaten - Burned)
- Status: ${status || 'unknown'}
- Protein Gap: ${proteinGap || 0}g (negative = need more)
- Carb Gap: ${carbGap || 0}g
- Fat Gap: ${fatGap || 0}g
- Weight Trend: ${weightTrend || 'stable'}
- Logging Compliance: ${complianceScore || 0}%
` : '';

    const prompt = `You are a fitness coach AI. Analyze this user's recent activity and provide personalized insights:

User Data:
- Daily calorie intake: ${calorieIntake} cal (target: ${calorieTarget} cal)
- Exercise this week: ${exerciseMinutes} minutes
- Water intake: ${waterIntake} ml (target: 3000 ml)
- Fitness goal: ${goal}
- Recent trend: ${recentTrend}
${fleContext}

IMPORTANT: Your insights MUST align with the Fitness Logic Engine analysis above.
DO NOT contradict the calorie targets or macro gaps.
If the user is under target, encourage them to eat more.
If the user is over target, suggest adjustments.

Provide:
1. Overall assessment (1-2 sentences)
2. What they're doing well
3. Areas for improvement
4. Specific actionable recommendation

Keep it encouraging and practical. Format as JSON:
{
  "assessment": "...",
  "strengths": ["...", "..."],
  "improvements": ["...", "..."],
  "recommendation": "...",
  "motivationalTip": "..."
}`;

    const text = await provider.generateText(prompt);
    const parsed = safeJsonFromText(text);
    return parsed || { text, raw: true };
  } catch (error) {
    console.error('AI API error:', error);
    throw new Error('Failed to generate insights');
  }
};

export const askFitnessQuestion = async (question, userContext = {}) => {
  try {
    const provider = getAIProvider();

    // Enhanced context with FLE data
    let contextInfo = '';
    if (Object.keys(userContext).length > 0) {
      contextInfo = `\n\nUser context:
- Goal: ${userContext.goal || 'not set'}
- Calorie Target: ${userContext.calorieTarget || 'not set'}
- Net Calories Today: ${userContext.netCalories || 'not tracked'}
- Weight: ${userContext.weight || 'not set'}kg
- Activity Level: ${userContext.activityLevel || 'not set'}`;

      if (userContext.aiContext) {
        contextInfo += `\n- Today's Status: ${userContext.aiContext.status || 'unknown'}`;
        contextInfo += `\n- Calorie Gap: ${userContext.aiContext.calorie_gap || 0}`;
        contextInfo += `\n- Protein Gap: ${userContext.aiContext.protein_gap || 0}g`;
      }
    }

    const prompt = `You are a knowledgeable fitness and nutrition coach. Answer this question clearly and concisely:

"${question}"
${contextInfo}

RULES:
1. Provide practical, evidence-based advice
2. Keep it under 200 words
3. If the user has calorie/macro targets, respect them in your advice
4. NEVER recommend extreme diets or dangerous practices
5. If unsure, recommend consulting a healthcare professional`;

    const text = await provider.generateText(prompt);
    return { answer: text };
  } catch (error) {
    console.error('AI API error:', error);
    const details = error?.message ? String(error.message) : String(error);
    throw new Error(`AI request failed: ${details}`);
  }
};

export const chat = async (prompt, userId) => {
  try {
    const provider = getAIProvider();
    const text = await provider.generateText(prompt);
    return text;
  } catch (error) {
    console.error('AI API error:', error);
    throw new Error('Failed to generate chat response: ' + error.message);
  }
};

export default {
  getProvider: () => getAIProvider(),
  getMealSuggestions,
  recognizeFood,
  getPersonalizedInsights,
  askFitnessQuestion,
  chat,
};
