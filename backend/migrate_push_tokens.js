import { pool } from './src/config/database.js';

const migrate = async () => {
  try {
    console.log('Starting Push Token migration...');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create push_tokens table
      await client.query(`
        CREATE TABLE IF NOT EXISTS push_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          token TEXT NOT NULL,
          device_id TEXT,
          platform TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          last_used_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id, token)
        );
      `);
      
      console.log('✅ Created push_tokens table');

      // Create index for performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
      `);

      /* 
      // Migrate logic disabled as column might not exist
      const existing = await client.query('SELECT id, push_token FROM users WHERE push_token IS NOT NULL');
      if (existing.rows.length > 0) {
        ...
      }
      */

      await client.query('COMMIT');
      console.log('✅ Push Token Migration successful');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Migration failed:', err);
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ Migration script error:', err);
  } finally {
    pool.end();
  }
};

migrate();
