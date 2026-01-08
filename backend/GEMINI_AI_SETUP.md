# Gemini AI Agent Integration - FitCoach Backend

## 🎯 Overview

The FitCoach backend is **fully configured** with Google's Gemini AI (gemini-2.0-flash-exp model). The AI agent provides intelligent fitness coaching features including meal suggestions, food recognition, personalized insights, and fitness Q&A.

---

## ✅ What's Already Set Up

### 1. **Dependencies Installed**
```json
"@google/generative-ai": "^0.2.1"
```

### 2. **Environment Variables**
Located in: `/backend/.env`
```bash
GEMINI_API_KEY=AIzaSyA7wR7DiWSWp5zYdQdOHbWUbDT2SfNexDU
```
✅ Your API key is already configured!

### 3. **File Structure**
```
backend/src/
├── services/ai.service.js          # Gemini AI integration logic
├── controllers/ai.controller.js    # Request handlers
├── routes/ai.routes.js             # API endpoints
└── validators/ai.validators.js     # Input validation
```

### 4. **Database Tables**
- `ai_insights` - Stores AI-generated insights, meal suggestions, and history
- Automatically logs all AI interactions for user history

---

## 🚀 Available AI Endpoints

### Base URL: `/api/ai`
All endpoints require authentication (JWT token in Authorization header)

### 1. **Get Meal Suggestions**
```http
POST /api/ai/meal-suggestions
Content-Type: application/json
Authorization: Bearer <your_jwt_token>

{
  "dietaryRestrictions": ["vegetarian", "gluten-free"],  // Optional
  "preferredCuisines": ["Indian", "Mediterranean"]        // Optional
}
```

**Response:**
```json
{
  "message": "Meal suggestions generated successfully",
  "suggestions": {
    "meals": [
      {
        "type": "breakfast",
        "name": "Protein-Packed Oatmeal Bowl",
        "description": "Creamy oats with Greek yogurt, berries, and nuts",
        "calories": 450,
        "protein": 25,
        "carbs": 55,
        "fat": 12,
        "ingredients": ["oats", "Greek yogurt", "blueberries", "almonds"],
        "tips": "Prepare oats the night before for a quick breakfast"
      },
      // ... lunch and dinner suggestions
    ]
  }
}
```

---

### 2. **Recognize Food from Description**
```http
POST /api/ai/recognize-food
Content-Type: application/json
Authorization: Bearer <your_jwt_token>

{
  "description": "two slices of whole wheat toast with peanut butter"
}
```

**Response:**
```json
{
  "message": "Food recognized successfully",
  "food": {
    "foodName": "Whole Wheat Toast with Peanut Butter",
    "confidence": "high",
    "servingSize": "2 slices",
    "calories": 320,
    "protein": 14,
    "carbs": 36,
    "fat": 16,
    "suggestions": "Consider adding banana for extra nutrients"
  }
}
```

---

### 3. **Get Personalized Insights**
```http
GET /api/ai/insights
Authorization: Bearer <your_jwt_token>
```

**Response:**
```json
{
  "message": "Insights generated successfully",
  "insights": {
    "assessment": "You're making good progress toward your goal!",
    "strengths": [
      "Consistent exercise routine",
      "Meeting protein targets"
    ],
    "improvements": [
      "Increase water intake to 3L daily",
      "Try to eat more vegetables"
    ],
    "recommendation": "Add a 15-minute walk after dinner to boost daily activity",
    "motivationalTip": "Small daily improvements lead to big results!"
  }
}
```

---

### 4. **Ask Fitness/Nutrition Question**
```http
POST /api/ai/ask
Content-Type: application/json
Authorization: Bearer <your_jwt_token>

{
  "question": "What's the best time to eat protein for muscle building?"
}
```

**Response:**
```json
{
  "question": "What's the best time to eat protein for muscle building?",
  "answer": "For optimal muscle building, aim to consume 20-30g of protein within 2 hours after your workout. This post-workout window is ideal for muscle protein synthesis. However, total daily protein intake (1.6-2.2g per kg body weight) distributed across 4-5 meals is more important than timing alone. Include a protein source with each meal, especially breakfast and post-workout."
}
```

---

### 5. **Get AI Insights History**
```http
GET /api/ai/history?type=personalized_insight&limit=10
Authorization: Bearer <your_jwt_token>
```

**Query Parameters:**
- `type` (optional): Filter by insight type (`meal_suggestion`, `personalized_insight`)
- `limit` (optional): Number of records (default: 10)

**Response:**
```json
{
  "insights": [
    {
      "id": 123,
      "type": "personalized_insight",
      "content": { /* insight object */ },
      "metadata": { /* context data */ },
      "createdAt": "2026-01-07T10:30:00Z",
      "isRead": false
    }
  ],
  "count": 5
}
```

---

## 🔧 How to Use in Your App

### Frontend (React Native)

```javascript
// Example: Get meal suggestions
const getMealSuggestions = async () => {
  try {
    const token = await AsyncStorage.getItem('accessToken');
    const response = await fetch('http://localhost:5001/api/ai/meal-suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        dietaryRestrictions: ['vegetarian'],
        preferredCuisines: ['Indian', 'Italian']
      })
    });
    
    const data = await response.json();
    console.log('AI Suggestions:', data.suggestions);
    return data.suggestions;
  } catch (error) {
    console.error('AI Error:', error);
  }
};

// Example: Recognize food
const recognizeFood = async (description) => {
  try {
    const token = await AsyncStorage.getItem('accessToken');
    const response = await fetch('http://localhost:5001/api/ai/recognize-food', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ description })
    });
    
    const data = await response.json();
    return data.food;
  } catch (error) {
    console.error('AI Error:', error);
  }
};

// Example: Get personalized insights
const getInsights = async () => {
  try {
    const token = await AsyncStorage.getItem('accessToken');
    const response = await fetch('http://localhost:5001/api/ai/insights', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
    
    const data = await response.json();
    return data.insights;
  } catch (error) {
    console.error('AI Error:', error);
  }
};

// Example: Ask a question
const askAI = async (question) => {
  try {
    const token = await AsyncStorage.getItem('accessToken');
    const response = await fetch('http://localhost:5001/api/ai/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ question })
    });
    
    const data = await response.json();
    return data.answer;
  } catch (error) {
    console.error('AI Error:', error);
  }
};
```

---

## 🎨 UI Implementation Ideas

### 1. **AI Coach Chat Interface**
Create a chat screen where users can ask questions and get instant AI responses.

### 2. **Smart Food Logger**
Add a "Describe Food" button that uses AI to recognize and log food from natural language.

### 3. **Daily Insights Widget**
Display personalized insights on the dashboard with motivational tips.

### 4. **Meal Planning Screen**
Generate weekly meal plans based on user preferences and goals.

---

## 🔐 Security Notes

- ✅ All endpoints require JWT authentication
- ✅ Rate limiting is enabled (100 requests per 15 minutes)
- ✅ API key is stored in environment variables (never in code)
- ✅ Input validation on all requests
- ✅ XSS protection middleware active

---

## 📊 AI Service Functions

### In `ai.service.js`:

| Function | Purpose | Model Used |
|----------|---------|------------|
| `getMealSuggestions()` | Generate personalized meal plans | gemini-2.0-flash-exp |
| `recognizeFood()` | Identify food from description | gemini-2.0-flash-exp |
| `getPersonalizedInsights()` | Analyze user data for coaching tips | gemini-2.0-flash-exp |
| `askFitnessQuestion()` | Answer fitness/nutrition questions | gemini-2.0-flash-exp |

---

## 🧪 Testing the AI Endpoints

### Using cURL:

```bash
# 1. Login first to get token
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}' \
  | jq -r '.accessToken')

# 2. Get meal suggestions
curl -X POST http://localhost:5001/api/ai/meal-suggestions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "dietaryRestrictions": ["vegetarian"],
    "preferredCuisines": ["Indian"]
  }'

# 3. Recognize food
curl -X POST http://localhost:5001/api/ai/recognize-food \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"description": "chicken tikka masala with rice"}'

# 4. Get insights
curl -X GET http://localhost:5001/api/ai/insights \
  -H "Authorization: Bearer $TOKEN"

# 5. Ask a question
curl -X POST http://localhost:5001/api/ai/ask \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"question": "How much protein should I eat daily?"}'
```

---

## 🚨 Common Issues & Solutions

### Issue: "Gemini API error: API key not valid"
**Solution:** Check that `GEMINI_API_KEY` is set in `/backend/.env`

### Issue: 401 Unauthorized
**Solution:** Ensure you're sending a valid JWT token in the Authorization header

### Issue: 500 Internal Server Error
**Solution:** Check backend logs with `tail -f backend/backend.log`

### Issue: Rate limit exceeded
**Solution:** Wait 15 minutes or increase rate limit in `server.js`

---

## 🎯 Next Steps - Implementation Ideas

### Quick Wins (Easy):
1. **Add "Ask AI Coach" button** in the Profile screen
2. **Smart food search** - let users describe food instead of searching
3. **Daily tip notification** - show AI insight on dashboard

### Medium Complexity:
1. **Meal planner tab** - Generate full weekly meal plans
2. **Progress insights** - Weekly AI-generated progress reports
3. **Recipe recommendations** - Based on available ingredients

### Advanced:
1. **Image recognition** - Add photo upload to recognize food (requires Gemini Vision)
2. **Voice chat** - Speak to AI coach using voice input
3. **Workout generator** - AI-generated custom workout plans

---

## 📚 Gemini AI Model Info

**Current Model:** `gemini-2.0-flash-exp`
- **Speed:** Very fast (< 2 seconds response)
- **Cost:** Free tier: 1500 requests/day
- **Context:** 1M token context window
- **Capabilities:** Text generation, structured JSON output, reasoning

---

## 🔄 Changing the AI Model

To use a different Gemini model, edit `ai.service.js`:

```javascript
// Change this line in each function:
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

// Options:
// - gemini-2.0-flash-exp (fastest, current)
// - gemini-1.5-pro (more accurate, slower)
// - gemini-1.5-flash (balanced)
```

---

## ✅ Summary

🎉 **Your AI agent is 100% ready to use!**

- ✅ Gemini API configured with valid key
- ✅ 4 AI endpoints active and tested
- ✅ Database logging enabled
- ✅ Authentication & security in place
- ✅ Ready for frontend integration

**Just start making API calls from your app!**

---

## 📞 Quick Reference

| What You Want | Endpoint | Method |
|---------------|----------|--------|
| Get meal ideas | `/api/ai/meal-suggestions` | POST |
| Recognize food | `/api/ai/recognize-food` | POST |
| Get daily tips | `/api/ai/insights` | GET |
| Ask questions | `/api/ai/ask` | POST |
| View history | `/api/ai/history` | GET |

**Backend Status:** ✅ Running on port 5001  
**Process ID:** 21016  
**Logs:** `backend/server.log`

---

Happy coding! 🚀
