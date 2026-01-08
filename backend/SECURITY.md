# Security Implementation

## Security Features Implemented

### 1. Input Validation

All API endpoints now have comprehensive input validation using `express-validator`:

#### Validation Rules
- **Email validation**: Proper email format with normalization
- **Password strength**: Minimum 8 characters, requires uppercase, lowercase, and number
- **Data type validation**: Ensures numbers, dates, and enums are valid
- **Range validation**: Limits for age (13-120), weight (20-500kg), height (50-300cm), etc.
- **String length limits**: Prevents buffer overflow attacks
- **SQL injection prevention**: Uses parameterized queries

#### Validators Created
- `auth.validators.js` - Registration, login, profile updates
- `food.validators.js` - Food logging with nutrition data
- `exercise.validators.js` - Exercise logging
- `water.validators.js` - Water intake tracking
- `ai.validators.js` - AI feature inputs
- `user.validators.js` - User preferences and data management

### 2. XSS Protection

**Middleware**: `sanitizeInput` in `validation.middleware.js`

Automatically sanitizes all user input by:
- Removing `<script>` tags
- Removing `<iframe>` tags
- Removing `javascript:` protocol
- Removing inline event handlers (`onclick=`, etc.)
- Applied globally to all requests

**Usage**:
```javascript
app.use(sanitizeInput);
```

### 3. Rate Limiting

**Global Rate Limit**:
- 100 requests per 15 minutes per IP
- Applied to all `/api/` routes

**Auth Rate Limit**:
- 5 requests per 15 minutes per IP
- Applied to authentication endpoints
- Skips successful requests

**Per-User Rate Limit**:
- `userRateLimit` middleware available
- Configurable per route if needed
- In-memory tracking with automatic cleanup

### 4. CORS Configuration

**Allowed Origins**:
- `http://localhost:8080`
- `http://localhost:8081`
- `http://localhost:19000`
- Expo dev server URL

**Options**:
- `credentials: true` - Allows cookies/auth headers
- Can be restricted to specific domains in production

### 5. Security Headers (Helmet)

Automatically adds security headers:
- `X-DNS-Prefetch-Control`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection`
- `Strict-Transport-Security` (when using HTTPS)

### 6. SQL Injection Prevention

All database queries use parameterized queries:
```javascript
await query('SELECT * FROM users WHERE id = $1', [userId]);
```

**Never** use string concatenation for SQL queries.

### 7. Authentication Security

#### JWT Tokens
- **Access Token**: 15 minutes expiry
- **Refresh Token**: 7 days expiry
- Both tokens are signed with `JWT_SECRET`

#### Password Security
- Hashed using `bcrypt` with 10 salt rounds
- Passwords never stored in plain text
- Passwords never returned in API responses

#### Token Storage
- Tokens stored in PostgreSQL with user association
- Tokens invalidated on logout
- Refresh tokens can be revoked

### 8. Data Privacy

#### GDPR Compliance
- **Data Export**: Users can download all their data in JSON format
- **Data Deletion**: Hard delete requires `DELETE_MY_DATA` confirmation
- **Account Deactivation**: Soft delete option available

#### Data Validation
- Confirmation required for sensitive operations
- User ownership verified for all data access
- Soft delete preserves data for recovery period

## Production Security Checklist

### Before Deploying to Production

#### 1. Environment Variables
- [ ] Use strong, randomly generated `JWT_SECRET` (minimum 256 bits)
- [ ] Set `NODE_ENV=production`
- [ ] Use production database credentials
- [ ] Store all secrets in environment variables, never in code

#### 2. HTTPS Configuration
- [ ] Obtain SSL/TLS certificate
- [ ] Force HTTPS redirect
- [ ] Set `secure: true` for cookies
- [ ] Enable HSTS (Strict-Transport-Security)

```javascript
// Add to server.js for production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

#### 3. CORS Restriction
Update CORS to only allow production domains:

```javascript
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://yourdomain.com', 'https://app.yourdomain.com']
  : ['http://localhost:8080', 'http://localhost:8081'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
```

#### 4. Rate Limiting Enhancement
Consider using Redis for distributed rate limiting:

```javascript
import RedisStore from 'rate-limit-redis';

const limiter = rateLimit({
  store: new RedisStore({
    client: redisClient
  }),
  windowMs: 15 * 60 * 1000,
  max: 100
});
```

#### 5. Database Security
- [ ] Use connection pooling with limits
- [ ] Enable SSL for database connections
- [ ] Use read-only database users where possible
- [ ] Regular backups with encryption
- [ ] Database connection string never exposed

#### 6. Logging and Monitoring
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Log all authentication attempts
- [ ] Log all failed requests
- [ ] Monitor for unusual patterns
- [ ] Never log sensitive data (passwords, tokens)

#### 7. Dependencies
- [ ] Run `npm audit` regularly
- [ ] Keep all dependencies updated
- [ ] Use `npm ci` for production builds
- [ ] Remove unused dependencies

#### 8. API Security
- [ ] Implement API versioning
- [ ] Add request signature validation for sensitive operations
- [ ] Consider adding 2FA for user accounts
- [ ] Implement webhook signature verification

## Security Best Practices

### 1. Input Validation
Always validate and sanitize user input at multiple layers:
1. Client-side (user experience)
2. API layer (this backend)
3. Database layer (constraints)

### 2. Error Handling
Never expose sensitive information in error messages:
```javascript
// ❌ Bad
res.status(500).json({ error: err.stack });

// ✅ Good
res.status(500).json({ error: 'Internal server error' });
console.error('Error details:', err);
```

### 3. Authentication
- Always use `authenticateToken` middleware for protected routes
- Never trust client-provided user IDs
- Always get user ID from verified JWT token
- Implement token refresh flow properly

### 4. Authorization
Always verify user owns the resource:
```javascript
const log = await query('SELECT * FROM food_logs WHERE id = $1 AND user_id = $2', 
  [logId, req.user.id]);
if (!log.rows[0]) {
  return res.status(404).json({ error: 'Not found' });
}
```

### 5. Data Exposure
Never return sensitive data unnecessarily:
```javascript
// Remove password from user objects
delete user.password;
delete user.refresh_token;
```

## Testing Security

### Manual Testing
1. **SQL Injection**: Try `' OR '1'='1` in inputs
2. **XSS**: Try `<script>alert('xss')</script>` in text fields
3. **CSRF**: Try requests without proper tokens
4. **Rate Limiting**: Send 100+ requests rapidly
5. **Authorization**: Try accessing other users' data

### Automated Testing
Consider adding security-focused tests:
- OWASP ZAP scanning
- npm audit in CI/CD
- Penetration testing before launch

## Incident Response

### If Security Breach Detected
1. **Immediate**: Revoke all active tokens
2. **Investigate**: Check logs for attack vector
3. **Patch**: Fix the vulnerability
4. **Notify**: Inform affected users
5. **Review**: Update security practices

## References
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
