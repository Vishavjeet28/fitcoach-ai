# Apply OAuth Database Migration

## Quick Command
```bash
cd /Users/vishavjeetsingh/Downloads/fitcoach-ai-main/backend
psql -U your_db_user -d fitcoach_db -f src/config/migrations/add_oauth_fields.sql
```

## Step-by-Step

1. **Navigate to backend**:
   ```bash
   cd /Users/vishavjeetsingh/Downloads/fitcoach-ai-main/backend
   ```

2. **Apply migration**:
   ```bash
   psql -U your_db_user -d fitcoach_db -f src/config/migrations/add_oauth_fields.sql
   ```
   
   Replace `your_db_user` with your PostgreSQL username (likely `postgres` or your Mac username).

3. **Verify migration**:
   ```bash
   psql -U your_db_user -d fitcoach_db -c "\d users"
   ```
   
   You should see these new columns:
   - `google_id` (varchar 255, nullable, unique)
   - `apple_id` (varchar 255, nullable, unique)
   - `auth_provider` (varchar 50, default 'email')
   - `profile_picture_url` (text, nullable)
   - `password_hash` (should now be nullable)

## Rollback (if needed)
```sql
ALTER TABLE users DROP COLUMN IF EXISTS google_id;
ALTER TABLE users DROP COLUMN IF EXISTS apple_id;
ALTER TABLE users DROP COLUMN IF EXISTS auth_provider;
ALTER TABLE users DROP COLUMN IF EXISTS profile_picture_url;
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
DROP INDEX IF EXISTS idx_users_google_id;
DROP INDEX IF EXISTS idx_users_apple_id;
```

## Troubleshooting

**Error: password_hash contains NULL values**
```sql
-- First, update any NULL password_hash rows
UPDATE users SET password_hash = 'oauth_user' WHERE password_hash IS NULL;
-- Then apply migration
```

**Error: database does not exist**
- Check your database name in `.env`
- Create database: `createdb fitcoach_db`

**Error: permission denied**
- Use superuser: `sudo -u postgres psql`
- Or grant permissions: `GRANT ALL ON DATABASE fitcoach_db TO your_user;`
