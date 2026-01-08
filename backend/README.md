# FitCoach Backend API

Backend server for FitCoach - AI-powered fitness and nutrition tracking application with comprehensive food logging, exercise tracking, water intake monitoring, analytics, and AI-powered meal suggestions and insights.

## 🌟 Features

### Core Features
- ✅ **User Authentication** - JWT-based authentication with refresh tokens
- ✅ **Food Logging** - Track meals with detailed nutrition information
- ✅ **Exercise Tracking** - Log workouts with MET-based calorie calculations
- ✅ **Water Intake** - Monitor daily water consumption
- ✅ **Analytics** - Daily summaries, weekly trends, monthly stats, progress tracking
- ✅ **AI Features** - Gemini AI-powered meal suggestions, food recognition, personalized insights
- ✅ **User Management** - Profile, preferences, data export, privacy controls

### Security Features
- ✅ **Input Validation** - Comprehensive validation on all endpoints
- ✅ **XSS Protection** - Automatic sanitization of user input
- ✅ **Rate Limiting** - IP-based and per-user rate limiting
- ✅ **SQL Injection Prevention** - Parameterized queries
- ✅ **Security Headers** - Helmet.js for enhanced security
- ✅ **GDPR Compliance** - Data export and deletion capabilities

## 📊 API Overview

### Endpoints Summary
- **33+ API endpoints** across 7 feature areas
- **Authentication** (5 endpoints): Register, login, refresh, logout, profile update
- **Food Logging** (6 endpoints): CRUD operations, search, nutrition totals
- **Exercise Logging** (6 endpoints): CRUD operations, search, calorie totals
- **Water Tracking** (5 endpoints): Logging, totals, history
- **Analytics** (4 endpoints): Daily, weekly, monthly, progress
- **AI Features** (6 endpoints): Meal suggestions, food recognition, insights, Q&A
- **User Management** (6 endpoints): Profile, preferences, stats, export, delete, deactivate

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 15+
- macOS/Linux (or Windows with WSL)
- Optional: Gemini API key for AI features
- Optional: USDA API key for food database

### Installation

1. **Install PostgreSQL** (if not already installed):
```bash
brew install postgresql@15
brew services start postgresql@15
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
```

2. **Create Database**:
```bash
createdb fitcoach_db
```

3. **Install Dependencies**:
```bash
cd backend
npm install
```

4. **Set up Environment**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

Required variables:
```env
NODE_ENV=development
PORT=5001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fitcoach_db
DB_USER=your_username
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_key_at_least_32_characters_long
JWT_REFRESH_SECRET=your_refresh_secret_key_at_least_32_characters_long
```

Optional variables:
```env
GEMINI_API_KEY=your_gemini_api_key
USDA_API_KEY=your_usda_api_key

# AI provider/model selection (optional)
# Default provider is "gemini".
AI_PROVIDER=gemini

# Model override (no "models/" prefix). If omitted, the backend will try a safe default list.
AI_MODEL=gemini-2.5-flash

# Comma-separated fallbacks used if AI_MODEL isn't usable (e.g. not enabled for your key).
AI_MODEL_FALLBACKS=gemini-2.5-flash,gemini-2.0-flash,gemini-2.0-flash-lite
```

5. **Run Database Schema**:
```bash
psql fitcoach_db -f src/config/schema.sql
```

6. **Start Server**:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

7. **Verify Installation**:
```bash
curl http://localhost:5001/health
# Should return: {"status":"healthy","timestamp":"...","database":"connected"}
```

## 📖 API Documentation

Server will start on: `http://localhost:5001`

## 📚 API Documentation

### Base URL
```
http://localhost:5001/api
```

### Authentication

All protected endpoints require an `Authorization` header:
```
Authorization: Bearer <access_token>
```

#### Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "weight": 75,          # kg
  "height": 175,         # cm
  "age": 30,
  "gender": "male",
  "activityLevel": "moderate",
  "goal": "lose_weight"
}

Response:
{
  "message": "User registered successfully",
  "user": { ... },
  "accessToken": "...",
  "refreshToken": "..."
}
```

#### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "message": "Login successful",
  "user": { ... },
  "accessToken": "...",
  "refreshToken": "..."
}
```

#### Refresh Token
```bash
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "..."
}

Response:
{
  "message": "Token refreshed successfully",
  "accessToken": "...",
  "user": { ... }
}
```

#### Logout
```bash
POST /api/auth/logout
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "refreshToken": "..."
}

Response:
{
  "message": "Logged out successfully"
}
```

#### Update Profile
```bash
PATCH /api/auth/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "John Doe",
  "weight": 76,
  "calorieTarget": 2100
}

Response:
{
  "message": "Profile updated successfully",
  "user": { ... }
}
```

### Food Logging (Coming Soon)
```
GET    /api/food              # Get user's food logs
POST   /api/food              # Log food
PUT    /api/food/:id          # Update food log
DELETE /api/food/:id          # Delete food log
GET    /api/food/search       # Search food database
```

### Exercise Logging (Coming Soon)
```
GET    /api/exercise          # Get user's exercise logs
POST   /api/exercise          # Log exercise
PUT    /api/exercise/:id      # Update exercise log
DELETE /api/exercise/:id      # Delete exercise log
GET    /api/exercise/search   # Search exercise database
```

### Water Tracking (Coming Soon)
```
GET    /api/water             # Get water logs for today
POST   /api/water             # Log water intake
GET    /api/water/history     # Get water history
```

### Analytics (Coming Soon)
```
GET    /api/analytics/daily   # Get daily summary
GET    /api/analytics/weekly  # Get weekly trends
GET    /api/analytics/monthly # Get monthly stats
```

### AI Features (Coming Soon)
```
POST   /api/ai/meal-suggestion    # Get AI meal recommendations
POST   /api/ai/food-recognition   # Identify food from description
GET    /api/ai/insights           # Get personalized insights
```

## 🗂️ Database Schema

### Tables
- **users**: User accounts and profiles
- **refresh_tokens**: JWT refresh tokens
- **foods**: Food reference database
- **food_logs**: User food intake logs
- **exercises**: Exercise reference database
- **exercise_logs**: User exercise logs
- **water_logs**: Daily water intake
- **daily_summaries**: Aggregated daily stats
- **ai_insights**: AI-generated recommendations

## 🔐 Security Features

- **JWT Authentication**: Access tokens (15 min) + Refresh tokens (7 days)
- **bcrypt Password Hashing**: Secure password storage
- **Rate Limiting**: 100 req/15min general, 5 req/15min auth
- **Helmet.js**: Security headers
- **CORS**: Cross-origin resource sharing
- **Input Validation**: SQL injection protection
- **Environment Variables**: Secrets management

## 🛠️ Development

### Project Structure
```
backend/
├── src/
│   ├── config/          # Database, environment config
│   ├── controllers/     # Request handlers
│   ├── routes/          # API routes
│   ├── middleware/      # Auth, validation, error handling
│   ├── services/        # Business logic
│   ├── models/          # Database models
│   ├── utils/           # Helper functions
│   └── server.js        # Express app
├── .env                 # Environment variables
├── .env.example         # Environment template
├── package.json
└── README.md
```

### Environment Variables
```bash
NODE_ENV=development
PORT=5001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fitcoach_db
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
GEMINI_API_KEY=your_gemini_api_key
USDA_API_KEY=your_usda_api_key
```

### Database Commands
```bash
# Connect to database
psql fitcoach_db

# List tables
\dt

# Describe table
\d users

# Query users
SELECT * FROM users;

# Drop and recreate database
dropdb fitcoach_db
createdb fitcoach_db
psql fitcoach_db -f src/config/schema.sql
```

### Testing API

Use the provided test script:
```bash
chmod +x test-api.sh
./test-api.sh
```

Or use curl:
```bash
# Health check
curl http://localhost:5001/health

# Register
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 📊 API Response Format

### Success Response
```json
{
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "error": "Error message"
}
```

### Token Expired Response
```json
{
  "error": "Token expired",
  "code": "TOKEN_EXPIRED"
}
```

## 🚨 Error Handling

All endpoints return appropriate HTTP status codes:
- `200 OK`: Success
- `201 Created`: Resource created
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Access denied
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists
- `500 Internal Server Error`: Server error

## 📈 Roadmap

### Phase 1: Backend Setup ✅
- [x] Express server
- [x] PostgreSQL database
- [x] JWT authentication
- [x] User registration/login

### Phase 2: Data Persistence 🚧
- [ ] Food logging API
- [ ] Exercise logging API
- [ ] Water tracking
- [ ] Frontend integration

### Phase 3: Smart Features 📅
- [ ] USDA food database
- [ ] Exercise database
- [ ] AI meal recommendations
- [ ] Calorie calculations

### Phase 4: Production 📅
- [ ] Security hardening
- [ ] Privacy & data export
- [ ] Deployment setup
- [ ] CI/CD pipeline

## 📝 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For issues and questions, please open a GitHub issue.
