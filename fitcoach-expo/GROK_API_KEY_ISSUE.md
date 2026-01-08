# 🚨 Grok API Key Issue - Resolution Guide

## Problem
Both API keys tested are being rejected by the Grok xAI API with error:
```
"Incorrect API key provided"
```

## Keys Tested
1. ❌ `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` - Invalid
2. ❌ `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` - Invalid

## Current Behavior
✅ **Mock mode is OFF** - The app IS trying to call Grok API
⚠️ **API calls failing** - Getting 400 error from Grok
✅ **Fallback working** - App automatically uses smart mock responses when API fails

## How to Fix

### Step 1: Get a Valid Grok API Key
1. Go to https://console.x.ai
2. Sign in or create an account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the full key (starts with `xai-` or `gsk_`)

### Step 2: Add the Key to Your App
Open `/Users/vishavjeetsingh/Downloads/fitcoach-expo/src/services/aiService.ts`

Change line 7:
```typescript
const GROK_API_KEY = 'YOUR_NEW_VALID_KEY_HERE';
```

### Step 3: Restart the App
```bash
cd /Users/vishavjeetsingh/Downloads/fitcoach-expo
npx expo start --clear
```

## Testing the API Key

### Method 1: Using curl (Terminal)
```bash
curl -X POST https://api.x.ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -d '{
    "model": "grok-beta",
    "messages": [
      {"role": "user", "content": "Hello"}
    ],
    "max_tokens": 50
  }'
```

**Valid response will look like:**
```json
{
  "id": "chatcmpl-...",
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "Hello! How can I help you today?"
    }
  }]
}
```

**Invalid response will be:**
```json
{
  "code": "Client specified an invalid argument",
  "error": "Incorrect API key provided..."
}
```

### Method 2: Check Console Logs
When you use the Coach screen, check the Metro/Expo logs for:
- ✅ `🚀 Calling GROK API...` - Means it's trying
- ✅ `📡 Grok Response status: 200` - Success!
- ❌ `📡 Grok Response status: 400` - Invalid key
- ❌ `❌ Grok API Error Response:` - Shows the error details

## Alternative: Use Mock Mode (Temporary Solution)

If you can't get a valid Grok API key right now, you can use smart mock mode:

In `/Users/vishavjeetsingh/Downloads/fitcoach-expo/src/services/aiService.ts` line 11:
```typescript
const ENABLE_MOCK_MODE = true;  // Change false to true
```

This will:
- ✅ Stop trying to call the API
- ✅ Provide intelligent pre-programmed responses
- ✅ Make the app work without API errors
- ⚠️ Responses will be contextual but not as dynamic as real Grok

## Checklist

Before asking for help, verify:
- [ ] I have a valid Grok API key from https://console.x.ai
- [ ] I tested the key with curl command and it works
- [ ] I updated line 7 in aiService.ts with the new key
- [ ] I restarted Expo with `--clear` flag
- [ ] I'm checking the Metro logs for error messages

## Common Issues

### "API key not working"
- Make sure you copied the entire key
- Check for extra spaces or line breaks
- Verify the key is active in xAI console
- Some keys have usage limits - check your quota

### "Still getting 400 error"
- Wait a few minutes after creating the key
- Try creating a new key
- Check if your xAI account is verified
- Verify billing is set up (if required)

### "App not updating"
- Clear Metro cache: `npx expo start --clear`
- Delete .expo folder: `rm -rf .expo && npx expo start`
- Check that you edited the correct file (fitcoach-expo, not fitcoach-ai-main)

## Current Workaround

Your app IS working right now with intelligent fallback responses. The AI coach will:
- ✅ Respond to fitness questions
- ✅ Provide workout advice
- ✅ Give nutrition tips
- ✅ Answer hydration questions

The responses are pre-programmed but contextual based on your messages.

---
**Next Step**: Get a valid Grok API key from https://console.x.ai and update line 7 in aiService.ts
