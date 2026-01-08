#!/bin/bash

# FitCoach AI Endpoints Test Script
# Usage: ./test-ai.sh <your_email> <your_password>

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🤖 Testing FitCoach AI Endpoints${NC}"
echo "=================================="
echo ""

# Check if email and password provided
if [ $# -lt 2 ]; then
    echo -e "${RED}❌ Usage: ./test-ai.sh <email> <password>${NC}"
    exit 1
fi

EMAIL=$1
PASSWORD=$2
BASE_URL="http://localhost:5001"

# 1. Login to get token
echo -e "${BLUE}1️⃣  Logging in...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Login failed!${NC}"
    echo $LOGIN_RESPONSE | jq '.'
    exit 1
fi

echo -e "${GREEN}✅ Logged in successfully!${NC}"
echo "Token: ${TOKEN:0:20}..."
echo ""

# 2. Test Meal Suggestions
echo -e "${BLUE}2️⃣  Testing Meal Suggestions...${NC}"
MEAL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/ai/meal-suggestions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "dietaryRestrictions": ["vegetarian"],
    "preferredCuisines": ["Indian"]
  }')

echo "Response:"
echo $MEAL_RESPONSE | jq '.'
echo ""

# 3. Test Food Recognition
echo -e "${BLUE}3️⃣  Testing Food Recognition...${NC}"
FOOD_RESPONSE=$(curl -s -X POST "$BASE_URL/api/ai/recognize-food" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"description": "two eggs scrambled with cheese and toast"}')

echo "Response:"
echo $FOOD_RESPONSE | jq '.'
echo ""

# 4. Test Personalized Insights
echo -e "${BLUE}4️⃣  Testing Personalized Insights...${NC}"
INSIGHTS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/ai/insights" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo $INSIGHTS_RESPONSE | jq '.'
echo ""

# 5. Test Ask Question
echo -e "${BLUE}5️⃣  Testing AI Question & Answer...${NC}"
QUESTION_RESPONSE=$(curl -s -X POST "$BASE_URL/api/ai/ask" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"question": "What are the best foods for muscle recovery?"}')

echo "Response:"
echo $QUESTION_RESPONSE | jq '.'
echo ""

# 6. Test Insights History
echo -e "${BLUE}6️⃣  Testing Insights History...${NC}"
HISTORY_RESPONSE=$(curl -s -X GET "$BASE_URL/api/ai/history?limit=5" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo $HISTORY_RESPONSE | jq '.'
echo ""

echo -e "${GREEN}✅ All tests completed!${NC}"
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo "- Meal Suggestions: $(echo $MEAL_RESPONSE | jq -r '.message // "Error"')"
echo "- Food Recognition: $(echo $FOOD_RESPONSE | jq -r '.message // "Error"')"
echo "- Insights: $(echo $INSIGHTS_RESPONSE | jq -r '.message // "Error"')"
echo "- Question: $(echo $QUESTION_RESPONSE | jq -r '.question // "Error"')"
echo "- History: $(echo $HISTORY_RESPONSE | jq -r '.count // 0') insights found"
