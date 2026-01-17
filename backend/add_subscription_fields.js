import { query } from './src/config/database.js';

async function migrate() {
  try {
    console.log('Starting migration...');

    // Add subscription_status column
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'free'
    `);
    console.log('Added subscription_status column');

    // Add ai_usage_count column
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS ai_usage_count INTEGER DEFAULT 0
    `);
    console.log('Added ai_usage_count column');

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
