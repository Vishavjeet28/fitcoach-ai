#!/bin/bash

echo "🧪 Testing FitCoach Backend API"
echo "================================"
echo ""

# Test health endpoint
echo "1️⃣ Testing Health Endpoint..."
curl -s http://localhost:5001/health | jq .
echo ""
echo ""

# Test registration
echo "2️⃣ Testing Registration..."
curl -s -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User",
    "weight": 75,
    "height": 175,
    "age": 30,
    "gender": "male",
    "activityLevel": "moderate",
    "goal": "maintain_weight"
  }' | jq .
echo ""
echo ""

# Test login
echo "3️⃣ Testing Login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

echo "$LOGIN_RESPONSE" | jq .
echo ""
echo ""

# Extract access token
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken')

if [ "$ACCESS_TOKEN" != "null" ] && [ -n "$ACCESS_TOKEN" ]; then
  echo "✅ Got access token!"
  echo ""
  
  # Test protected endpoint
  echo "4️⃣ Testing Protected Endpoint (requires auth)..."
  curl -s -X PATCH http://localhost:5001/api/auth/profile \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d '{
      "weight": 76
    }' | jq .
  echo ""
else
  echo "❌ Failed to get access token"
fi

echo ""
echo "✅ API tests complete!"
