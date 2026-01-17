import { pool } from './src/config/database.js';

const migrate = async () => {
  try {
    console.log('Starting migration...');
    const client = await pool.connect();
    try {
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS push_token TEXT;
      `);
      console.log('✅ Migration successful: Added push_token to users table');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    pool.end();
  }
};

migrate();
