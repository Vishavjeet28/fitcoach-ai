# 🔑 OpenAI API Setup Guide

## Quick Setup (5 minutes)

### Step 1: Get Your OpenAI API Key

1. **Go to OpenAI Platform**: https://platform.openai.com/
2. **Sign up or Log in** to your account
3. **Navigate to API Keys**: Click your profile → "View API keys"
4. **Create New Key**: Click "Create new secret key"
5. **Copy the key**: It starts with `sk-proj-...` (⚠️ Save it immediately, you can't see it again!)

### Step 2: Add Key to Your App

Open `src/services/aiService.ts` and replace the placeholder:

```typescript
const OPENAI_API_KEY = 'sk-proj-YOUR_ACTUAL_KEY_HERE'; // Paste your real key here
```

### Step 3: Test It!

Run the app and go to the Coach tab. Ask a question like:
- "What should I eat for breakfast?"
- "Create a workout plan for me"

---

## 💰 Pricing (Very Affordable!)

**GPT-4o Pricing:**
- Input: $2.50 per 1M tokens (~750,000 words)
- Output: $10.00 per 1M tokens (~750,000 words)

**Example Usage:**
- 100 conversations = ~$0.20 USD
- 1,000 messages = ~$2.00 USD

**Free Tier:**
- New accounts get $5 free credit
- Good for ~2,500 AI coach conversations!

---

## 🔒 Security Best Practices

### For Development (Current Setup):
✅ API key hardcoded in `aiService.ts`
✅ Good for testing and personal use
⚠️ Don't commit to public GitHub repos

### For Production (Recommended):
1. **Use Environment Variables**
   ```typescript
   const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_KEY;
   ```

2. **Create `.env` file**:
   ```
   EXPO_PUBLIC_OPENAI_KEY=sk-proj-your-key-here
   ```

3. **Add to `.gitignore`**:
   ```
   .env
   .env.*
   ```

4. **Better: Use a Backend Proxy**
   - Hide your API key on a server
   - Add rate limiting
   - Monitor usage
   - Implement user authentication

---

## 🚀 Alternative: Use Free Local AI

If you don't want to use OpenAI, you can:

1. **Use Ollama (100% Free)**:
   - Install Ollama: https://ollama.ai
   - Run: `ollama run llama3`
   - Update `aiService.ts` to call `localhost:11434`

2. **Use Groq (Free Tier)**:
   - Sign up: https://groq.com
   - Get free API access
   - Very fast responses!

3. **Use Hugging Face**:
   - Sign up: https://huggingface.co
   - Use free inference API
   - Many models available

---

## 📱 Current Implementation

**File**: `src/services/aiService.ts`

**How it works**:
1. Uses native `fetch()` API (React Native compatible)
2. Makes direct HTTPS calls to OpenAI
3. No Node.js dependencies needed
4. Works on iOS, Android, and Web

**Methods Available**:
- `chat()` - Simple single message
- `chatWithHistory()` - Conversation with context
- `getFitnessAdvice()` - Personalized fitness tips
- `analyzeFoodItem()` - Nutrition analysis
- `getWorkoutPlan()` - Exercise recommendations
- `getMealSuggestions()` - Meal planning
- `analyzeDailyIntake()` - Daily feedback
- `getHydrationAdvice()` - Hydration tips

---

## 🐛 Troubleshooting

### "API Error: 401"
- Your API key is invalid or missing
- Make sure you copied the full key (starts with `sk-proj-`)
- Check for extra spaces or quotes

### "API Error: 429"
- You've exceeded your rate limit
- Wait a few seconds and try again
- Upgrade your OpenAI plan if needed

### "Network request failed"
- Check your internet connection
- Make sure the API URL is correct
- Try disabling any VPN or firewall

### "No response from AI"
- The API might be down (rare)
- Check OpenAI status: https://status.openai.com
- Try again in a few seconds

---

## 📊 Monitor Usage

**Check your usage**:
1. Go to: https://platform.openai.com/usage
2. See daily/monthly costs
3. Set spending limits
4. Get usage alerts

**Set Budget Limits**:
1. Go to: https://platform.openai.com/account/billing/limits
2. Set hard limit (e.g., $10/month)
3. Get email alerts at 80% and 100%

---

## 🎯 Cost Optimization Tips

1. **Limit max_tokens**: Currently set to 1000 (good balance)
2. **Use temperature wisely**: 0.7 is good for creative responses
3. **Cache common responses**: Store FAQ answers locally
4. **Add rate limiting**: Prevent spam/abuse
5. **Use streaming**: Show responses as they come (TODO)

---

## ✅ You're Ready!

Your AI Coach is now connected to OpenAI GPT-4o! 🎉

**Test it**:
1. Open the Coach tab
2. Try a suggested prompt
3. Watch GPT-4o respond in real-time

**What you get**:
- ✨ Real AI fitness coaching
- 🧠 Context-aware conversations
- 💪 Personalized workout plans
- 🥗 Smart nutrition advice
- 💧 Hydration tips
- 📊 Progress analysis

Enjoy your AI-powered fitness journey! 🚀💪
