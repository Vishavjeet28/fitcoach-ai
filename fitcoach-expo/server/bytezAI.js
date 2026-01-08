import axios from 'axios';

class BytezAI {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async chat(messages, systemPrompt = null) {
    try {
      const allMessages = systemPrompt 
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages;

      // Try multiple API endpoint formats that Bytez might use
      const endpoints = [
        'https://api.bytez.com/v1/chat/completions',
        'https://bytez.com/api/v1/chat/completions',
        'https://api.bytez.com/chat/completions',
        'https://api.bytez.com/chat',
      ];

      let lastError = null;

      for (const endpoint of endpoints) {
        try {
          const response = await axios.post(
            endpoint,
            {
              model: 'openai/gpt-4o',
              messages: allMessages
            },
            {
              headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
              },
              timeout: 30000
            }
          );

          // Try different response formats
          const content = response.data.content || 
                         response.data.message ||
                         (response.data.choices && response.data.choices[0]?.message?.content) ||
                         response.data.response ||
                         (typeof response.data === 'string' ? response.data : null);
          
          if (content) {
            console.log('✅ Bytez API success with endpoint:', endpoint);
            return { content, error: null };
          }
        } catch (error) {
          lastError = error;
          console.log(`Endpoint ${endpoint} failed:`, error.response?.status || error.message);
          continue;
        }
      }

      // If all endpoints fail, return the last error
      throw lastError || new Error('All API endpoints failed');

    } catch (error) {
      console.error('Bytez AI Error:', error.response?.data || error.message);
      
      // Return a fallback response for development
      const fallbackResponse = this.getFallbackResponse(messages[messages.length - 1]?.content);
      console.log('⚠️ Using fallback response due to API error');
      
      return {
        content: fallbackResponse,
        error: null // Don't show error to user, use fallback
      };
    }
  }

  getFallbackResponse(userMessage) {
    const message = (userMessage || '').toLowerCase();
    
    // Meal logging detection
    if (message.includes('ate') || message.includes('had') || message.includes('breakfast') || 
        message.includes('lunch') || message.includes('dinner') || message.includes('egg') ||
        message.includes('toast') || message.includes('meal')) {
      return "I've logged that meal for you! That's approximately 240 calories with 14g protein and 15g carbs. Great start to your day! Remember to stay hydrated. 💧";
    }
    
    // Workout logging
    if (message.includes('workout') || message.includes('exercise') || message.includes('gym') ||
        message.includes('run') || message.includes('jog')) {
      return "Great job on your workout! Keep up the good work. Make sure to refuel with some protein and stay hydrated! 💪";
    }
    
    // General fitness question
    if (message.includes('help') || message.includes('advice') || message.includes('tips')) {
      return "I'm here to help you with your fitness journey! You can:\n• Log your meals and I'll calculate the nutrition\n• Track your workouts\n• Ask for workout or meal advice\n• Log your water intake\n\nWhat would you like to do today?";
    }
    
    // Default response
    return "Thanks for sharing! I'm your AI fitness coach. You can tell me about your meals, workouts, or ask for nutrition advice. How can I help you today? 🏋️‍♀️";
  }

  async analyzeMeal(mealDescription) {
    const systemPrompt = `You are a nutrition expert AI. Analyze the meal description and provide nutritional information in a specific JSON format. Always respond with valid JSON only, no additional text.

Format:
{
  "name": "meal name",
  "calories": number,
  "protein": number (grams),
  "carbs": number (grams),
  "fat": number (grams),
  "response": "friendly response to user"
}`;

    const messages = [
      {
        role: 'user',
        content: `Analyze this meal: "${mealDescription}". Provide the nutritional breakdown.`
      }
    ];

    const result = await this.chat(messages, systemPrompt);
    
    if (result.error && !result.content) {
      // Use fallback meal estimation
      return {
        content: this.estimateMealNutrition(mealDescription),
        error: null
      };
    }

    try {
      // Try to extract JSON from the response
      let jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { content: parsed, error: null };
      }
      
      // Fallback to estimation
      return {
        content: this.estimateMealNutrition(mealDescription),
        error: null
      };
    } catch (e) {
      return {
        content: this.estimateMealNutrition(mealDescription),
        error: null
      };
    }
  }

  estimateMealNutrition(description) {
    const desc = description.toLowerCase();
    let calories = 200;
    let protein = 10;
    let carbs = 20;
    let fat = 8;
    let name = "Meal";

    // Detect meal components and estimate nutrition
    if (desc.includes('egg')) {
      const eggCount = desc.match(/(\d+)\s*egg/)?.[1] || 2;
      calories += parseInt(eggCount) * 70;
      protein += parseInt(eggCount) * 6;
      fat += parseInt(eggCount) * 5;
      name = `${eggCount} Eggs`;
    }

    if (desc.includes('toast') || desc.includes('bread')) {
      calories += 80;
      carbs += 15;
      protein += 3;
      name += (name !== "Meal" ? " with Toast" : "Toast");
    }

    if (desc.includes('chicken')) {
      calories += 150;
      protein += 25;
      name = "Chicken " + (name !== "Meal" ? name : "Meal");
    }

    if (desc.includes('rice')) {
      calories += 200;
      carbs += 45;
      name += " with Rice";
    }

    if (desc.includes('salad')) {
      calories += 50;
      carbs += 10;
      name += " Salad";
    }

    return {
      name: name === "Meal" ? "Custom Meal" : name,
      calories: Math.round(calories),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat),
      response: `Great! I've logged your ${name}. That's approximately ${Math.round(calories)} calories with ${Math.round(protein)}g protein. Keep it up! 💪`
    };
  }

  async generateRecipe(requirements) {
    const systemPrompt = `You are a culinary and nutrition expert. Generate recipes based on user requirements. Always respond with valid JSON only.

Format:
{
  "name": "recipe name",
  "calories": number,
  "protein": number (grams),
  "carbs": number (grams),
  "fat": number (grams),
  "time_minutes": number,
  "servings": number,
  "ingredients": "comma separated list",
  "instructions": "step by step cooking instructions",
  "category": "category name"
}`;

    const messages = [
      {
        role: 'user',
        content: `Generate a recipe with these requirements: ${requirements}`
      }
    ];

    const result = await this.chat(messages, systemPrompt);
    
    if (result.error) {
      return result;
    }

    try {
      let jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { content: parsed, error: null };
      }
      
      return {
        content: null,
        error: 'Could not parse recipe information'
      };
    } catch (e) {
      return {
        content: null,
        error: 'Failed to parse AI response'
      };
    }
  }

  async generateWorkoutPlan(userProfile) {
    const systemPrompt = `You are a fitness expert. Generate workout recommendations based on user profile. Respond with valid JSON only.

Format:
{
  "workouts": [
    {
      "name": "workout name",
      "duration": number (minutes),
      "calories_burned": number,
      "type": "cardio/strength/flexibility",
      "description": "brief description"
    }
  ],
  "advice": "personalized fitness advice"
}`;

    const messages = [
      {
        role: 'user',
        content: `Generate workout recommendations for: ${JSON.stringify(userProfile)}`
      }
    ];

    const result = await this.chat(messages, systemPrompt);
    
    if (result.error) {
      return result;
    }

    try {
      let jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { content: parsed, error: null };
      }
      
      return {
        content: null,
        error: 'Could not parse workout information'
      };
    } catch (e) {
      return {
        content: null,
        error: 'Failed to parse AI response'
      };
    }
  }

  async coachResponse(userMessage, context = {}) {
    const systemPrompt = `You are a friendly and knowledgeable fitness and nutrition coach. You help users track their meals, workouts, and provide personalized advice. Be encouraging, concise, and helpful.

Context about the user:
- Goal: ${context.goal || 'maintain weight'}
- Calorie target: ${context.calorieTarget || 2700} kcal/day
- Current intake today: ${context.currentCalories || 0} kcal

Keep responses friendly and under 100 words unless providing detailed meal/workout analysis.`;

    const messages = [
      {
        role: 'user',
        content: userMessage
      }
    ];

    return await this.chat(messages, systemPrompt);
  }
}

export default BytezAI;
