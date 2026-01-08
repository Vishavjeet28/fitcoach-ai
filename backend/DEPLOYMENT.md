# Production Deployment Guide

## Overview
This guide covers deploying the FitCoach AI backend to production, including database setup, environment configuration, and hosting options.

## Prerequisites
- Node.js 18+ installed
- PostgreSQL 14+ database
- Domain name (for HTTPS)
- SSL certificate

## Deployment Options

### Option 1: Heroku (Recommended for Quick Deploy)

#### 1. Install Heroku CLI
```bash
brew install heroku/brew/heroku  # macOS
# or download from https://devcenter.heroku.com/articles/heroku-cli
```

#### 2. Login and Create App
```bash
heroku login
heroku create fitcoach-ai-backend
```

#### 3. Add PostgreSQL Database
```bash
heroku addons:create heroku-postgresql:mini
```

#### 4. Set Environment Variables
```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=$(openssl rand -base64 64)
heroku config:set JWT_REFRESH_SECRET=$(openssl rand -base64 64)
heroku config:set GEMINI_API_KEY=your_gemini_api_key
heroku config:set USDA_API_KEY=your_usda_api_key
```

#### 5. Create Procfile
```
web: node src/server.js
```

#### 6. Deploy
```bash
git push heroku main
```

#### 7. Run Database Migrations
```bash
heroku run node src/scripts/init-db.js
```

#### 8. Check Logs
```bash
heroku logs --tail
```

### Option 2: AWS EC2

#### 1. Launch EC2 Instance
- Choose Ubuntu 22.04 LTS
- Instance type: t3.small or larger
- Security group: Allow ports 22 (SSH), 80 (HTTP), 443 (HTTPS)

#### 2. Connect and Setup
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install PM2 for process management
sudo npm install -g pm2
```

#### 3. Setup PostgreSQL
```bash
sudo -u postgres psql

CREATE DATABASE fitcoach_production;
CREATE USER fitcoach_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE fitcoach_production TO fitcoach_user;
\q
```

#### 4. Clone and Setup Application
```bash
cd /var/www
sudo git clone https://github.com/yourusername/fitcoach-ai.git
cd fitcoach-ai/backend
sudo npm install --production

# Create .env file
sudo nano .env
```

Add to `.env`:
```env
NODE_ENV=production
PORT=5001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fitcoach_production
DB_USER=fitcoach_user
DB_PASSWORD=your_secure_password
JWT_SECRET=your_long_random_secret_key
JWT_REFRESH_SECRET=your_long_random_refresh_secret
GEMINI_API_KEY=your_gemini_api_key
USDA_API_KEY=your_usda_api_key
```

#### 5. Run Database Migrations
```bash
node src/scripts/init-db.js
```

#### 6. Start Application with PM2
```bash
pm2 start src/server.js --name fitcoach-backend
pm2 save
pm2 startup
```

#### 7. Setup Nginx Reverse Proxy
```bash
sudo apt install -y nginx

sudo nano /etc/nginx/sites-available/fitcoach
```

Add configuration:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/fitcoach /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 8. Setup SSL with Let's Encrypt
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

### Option 3: DigitalOcean App Platform

#### 1. Create App
- Connect your GitHub repository
- Select "Web Service"
- Auto-detect Node.js

#### 2. Add Database
- Add PostgreSQL database component
- Connection string will be auto-injected

#### 3. Environment Variables
Add in App Platform dashboard:
- `NODE_ENV=production`
- `JWT_SECRET=your_secret`
- `JWT_REFRESH_SECRET=your_refresh_secret`
- `GEMINI_API_KEY=your_api_key`
- `USDA_API_KEY=your_api_key`

#### 4. Build Settings
- Build Command: `npm install`
- Run Command: `node src/server.js`

#### 5. Deploy
Click "Deploy" - automatic from Git pushes

### Option 4: Railway

#### 1. Install Railway CLI
```bash
npm install -g @railway/cli
```

#### 2. Login and Initialize
```bash
railway login
railway init
```

#### 3. Add PostgreSQL
```bash
railway add postgresql
```

#### 4. Set Environment Variables
```bash
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=$(openssl rand -base64 64)
railway variables set JWT_REFRESH_SECRET=$(openssl rand -base64 64)
railway variables set GEMINI_API_KEY=your_api_key
railway variables set USDA_API_KEY=your_api_key
```

#### 5. Deploy
```bash
railway up
```

## Post-Deployment Checklist

### 1. Verify Deployment
```bash
curl https://api.yourdomain.com/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected"
}
```

### 2. Test Authentication
```bash
# Register
curl -X POST https://api.yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234",
    "name": "Test User"
  }'

# Login
curl -X POST https://api.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234"
  }'
```

### 3. Monitor Logs
- Set up log aggregation (Papertrail, Loggly, CloudWatch)
- Monitor error rates
- Track API response times

### 4. Set Up Monitoring
Consider these tools:
- **Uptime**: UptimeRobot, Pingdom
- **APM**: New Relic, Datadog
- **Errors**: Sentry, Rollbar

### 5. Database Backups
```bash
# PostgreSQL backup (run daily via cron)
pg_dump -U fitcoach_user -d fitcoach_production > backup_$(date +%Y%m%d).sql

# Restore from backup
psql -U fitcoach_user -d fitcoach_production < backup_20240101.sql
```

### 6. Performance Optimization
```bash
# Enable database connection pooling
# Already configured in database.js

# Add caching layer (optional)
npm install redis
# Configure Redis for session storage and caching
```

## Environment Variables Reference

### Required Variables
```env
NODE_ENV=production
PORT=5001
DB_HOST=your_db_host
DB_PORT=5432
DB_NAME=fitcoach_production
DB_USER=your_db_user
DB_PASSWORD=your_db_password
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
```

### Optional Variables
```env
GEMINI_API_KEY=your_gemini_api_key
USDA_API_KEY=your_usda_api_key
REDIS_URL=redis://your_redis_url
SENTRY_DSN=your_sentry_dsn
LOG_LEVEL=info
```

## SSL/TLS Configuration

### Let's Encrypt (Free)
```bash
sudo certbot certonly --standalone -d api.yourdomain.com
```

### Custom Certificate
```javascript
// src/server.js
import https from 'https';
import fs from 'fs';

const options = {
  key: fs.readFileSync('/path/to/private.key'),
  cert: fs.readFileSync('/path/to/certificate.crt'),
  ca: fs.readFileSync('/path/to/ca_bundle.crt')
};

https.createServer(options, app).listen(PORT);
```

## CI/CD Pipeline

### GitHub Actions Example
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: |
        cd backend
        npm ci
    
    - name: Run tests
      run: |
        cd backend
        npm test
    
    - name: Deploy to Heroku
      uses: akhileshns/heroku-deploy@v3.12.14
      with:
        heroku_api_key: ${{secrets.HEROKU_API_KEY}}
        heroku_app_name: "fitcoach-ai-backend"
        heroku_email: "your-email@example.com"
```

## Scaling Considerations

### Horizontal Scaling
- Deploy multiple instances behind load balancer
- Use Redis for shared session storage
- Database read replicas for read-heavy operations

### Vertical Scaling
- Start with t3.small on AWS
- Monitor CPU/memory usage
- Scale up to t3.medium/large as needed

### Database Optimization
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_food_logs_user_date ON food_logs(user_id, logged_at);
CREATE INDEX idx_exercise_logs_user_date ON exercise_logs(user_id, logged_at);
CREATE INDEX idx_daily_summaries_user_date ON daily_summaries(user_id, date);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM food_logs WHERE user_id = 1;
```

## Troubleshooting

### App Won't Start
```bash
# Check logs
pm2 logs fitcoach-backend

# Check database connection
psql -U fitcoach_user -d fitcoach_production

# Check environment variables
pm2 env 0
```

### High Memory Usage
```bash
# Restart app
pm2 restart fitcoach-backend

# Check memory
pm2 monit

# Investigate memory leaks
node --inspect src/server.js
```

### Slow Queries
```sql
-- Enable query logging
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- Log queries > 1s
SELECT pg_reload_conf();

-- View slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
```

## Security Hardening

### Firewall Setup (UFW on Ubuntu)
```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### Fail2Ban (Protect against brute force)
```bash
sudo apt install -y fail2ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Regular Updates
```bash
# Set up automatic security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Maintenance

### Regular Tasks
- **Daily**: Check error logs, monitor uptime
- **Weekly**: Review database performance, check disk space
- **Monthly**: Update dependencies (`npm audit`, `npm update`)
- **Quarterly**: Review and update SSL certificates, security audit

### Update Deployment
```bash
# Pull latest code
cd /var/www/fitcoach-ai/backend
sudo git pull

# Install new dependencies
sudo npm install --production

# Run migrations if needed
node src/scripts/migrate.js

# Restart app
pm2 restart fitcoach-backend
```

## Support and Resources

- [Express.js Deployment](https://expressjs.com/en/advanced/best-practice-performance.html)
- [PostgreSQL Performance](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
