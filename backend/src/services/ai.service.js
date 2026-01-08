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

    const { calorieIntake, calorieTarget, exerciseMinutes, waterIntake, goal, recentTrend } = userData;

    const prompt = `You are a fitness coach AI. Analyze this user's recent activity and provide personalized insights:

User Data:
- Daily calorie intake: ${calorieIntake} cal (target: ${calorieTarget} cal)
- Exercise this week: ${exerciseMinutes} minutes
- Water intake: ${waterIntake} ml (target: 3000 ml)
- Fitness goal: ${goal}
- Recent trend: ${recentTrend}

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
    const contextInfo = Object.keys(userContext).length > 0 ? `\n\nUser context: ${JSON.stringify(userContext)}` : '';
    const prompt = `You are a knowledgeable fitness and nutrition coach. Answer this question clearly and concisely:\n\n"${question}"${contextInfo}\n\nProvide practical, evidence-based advice. Keep it under 200 words.`;

    const text = await provider.generateText(prompt);
    return { answer: text };
  } catch (error) {
    console.error('AI API error:', error);
    const details = error?.message ? String(error.message) : String(error);
    throw new Error(`AI request failed: ${details}`);
  }
};

export default {
  getProvider: () => getAIProvider(),
  getMealSuggestions,
  recognizeFood,
  getPersonalizedInsights,
  askFitnessQuestion,
};
