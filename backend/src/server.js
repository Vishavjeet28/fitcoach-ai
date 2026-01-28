import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { pool, query } from './config/database.js';
import { sanitizeInput } from './middleware/validation.middleware.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Request ID Middleware (MUST be first)
app.use((req, res, next) => {
  req.requestId = uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    // Allow all localhost, Expo, and local network IPs
    const allowedOrigins = [
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
      /^exp:\/\//,
      /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
      /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:\d+$/
    ];

    const isAllowed = allowedOrigins.some(pattern => pattern.test(origin));
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked origin: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // LIMIT INCREASED FOR DEV: 500 requests per 15 min
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limit for AI endpoints (IP-based abuse protection)
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // LIMIT INCREASED FOR DEV: 1000 AI calls per hour
  message: 'Too many AI requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// XSS protection - sanitize all inputs
app.use(sanitizeInput);

// Logging middleware
morgan.token('requestId', (req) => req.requestId);
app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" [RequestID: :requestId]'));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await query('SELECT NOW()');
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// API routes
import authRoutes from './routes/auth.routes.js';
import foodRoutes from './routes/food.routes.js';
import exerciseRoutes from './routes/exercise.routes.js';
import waterRoutes from './routes/water.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import aiRoutes from './routes/ai.routes.js';
import userRoutes from './routes/user.routes.js';
import fitnessRoutes from './routes/fitness.routes.js';
import billingRoutes from './routes/billing.routes.js';
import weightRoutes from './routes/weight.routes.js';
import mealRoutes from './routes/meals.routes.js';
import workoutRoutes from './routes/workout.routes.js'; // NEW: Workout recommendations
import mealRecommendationRoutes from './routes/mealRecommendation.routes.js'; // NEW: Meal recommendations
import habitsRoutes from './routes/habits.routes.js'; // NEW: Habits tracking
import todosRoutes from './routes/todos.routes.js'; // NEW: Daily todos
import tipsRoutes from './routes/tips.routes.js'; // NEW: Daily tips
import streaksRoutes from './routes/streaks.routes.js';
import recipeRoutes from './routes/recipe.routes.js';
import postureCareRoutes from './routes/postureCare.routes.js'; // NEW: Posture & Pain Care
import liveWorkoutRoutes from './routes/liveWorkout.routes.js'; // NEW: Live Workout Execution
import yogaRoutes from './routes/yoga.routes.js'; // NEW: Yoga Module
import notificationRoutes from './routes/notification.routes.js'; // NEW: Smart Notifications

// Apply routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/exercise', exerciseRoutes);
app.use('/api/water', waterRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/user', userRoutes);
app.use('/api/fitness', fitnessRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/weight', weightRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/workout', workoutRoutes); // NEW: Workout system
app.use('/api/meal-recommendations', mealRecommendationRoutes); // NEW: AI meal recommendations
app.use('/api/habits', habitsRoutes); // NEW: Habits tracking
app.use('/api/todos', todosRoutes); // NEW: Daily todos
app.use('/api/tips', tipsRoutes); // NEW: Daily tips
app.use('/api/streaks', streaksRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/posture-care', postureCareRoutes); // NEW: Posture & Pain Care
app.use('/api/live-workout', liveWorkoutRoutes); // NEW: Live Workout Execution (Isolated)
app.use('/api/yoga', yogaRoutes); // NEW: Yoga Module
app.use('/api/notifications', notificationRoutes); // NEW: Smart Notifications

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    requestId: req.requestId
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[Error] RequestID: ${req.requestId} | Error:`, err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  // NEVER log stack trace in production response (security)
  res.status(statusCode).json({
    error: message,
    requestId: req.requestId,
    // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined // Strict production: hidden
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing server gracefully...');
  await pool.end();
  process.exit(0);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 FitCoach Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  // console.log(`🌐 Network access: http://<Your-IP>:${PORT}/health`);
});

export default app;
