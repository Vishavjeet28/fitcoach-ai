#!/usr/bin/env node

/**
 * ============================================================================
 * DATABASE MIGRATION RUNNER
 * ============================================================================
 * 
 * Runs SQL migrations against the PostgreSQL database.
 * 
 * Usage:
 *   node run_migrations.js
 *   node run_migrations.js --rollback
 * 
 * Location: /backend/run_migrations.js
 * ============================================================================
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'fitcoach',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const MIGRATIONS_DIR = path.join(__dirname, 'src', 'config', 'migrations');

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getAppliedMigrations() {
  const result = await pool.query('SELECT name FROM _migrations ORDER BY id');
  return result.rows.map(row => row.name);
}

async function applyMigration(filename, sql) {
  console.log(`  Applying: ${filename}...`);
  
  try {
    // Remove comments and split into statements
    // Handle BEGIN/COMMIT blocks by running them separately
    let cleanedSql = sql
      // Remove single-line comments
      .replace(/--.*$/gm, '')
      // Remove the DOWN MIGRATION section if it exists
      .split(/--\s*DOWN MIGRATION/i)[0];
    
    // Remove BEGIN and COMMIT as we handle transaction ourselves
    cleanedSql = cleanedSql
      .replace(/^BEGIN;?\s*$/gim, '')
      .replace(/^COMMIT;?\s*$/gim, '');
    
    // Do not split by semicolon for complex SQL (functions, triggers)
    // pg-node supports multiple statements in a single query
    const statements = [cleanedSql];
    
    // Run each statement in a transaction
    await pool.query('BEGIN');
    
    for (const stmt of statements) {
      if (stmt.length > 5) { // Skip empty or very short statements
        try {
          await pool.query(stmt);
        } catch (stmtError) {
          console.error(`  Statement failed: ${stmt.substring(0, 100)}...`);
          throw stmtError;
        }
      }
    }
    
    await pool.query('COMMIT');
    await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [filename]);
    console.log(`  ✅ Applied: ${filename}`);
    return true;
  } catch (error) {
    await pool.query('ROLLBACK').catch(() => {}); // Ignore rollback errors
    console.error(`  ❌ Failed: ${filename}`);
    console.error(`     Error: ${error.message}`);
    return false;
  }
}

async function runMigrations() {
  console.log('');
  console.log('============================================');
  console.log('  FitCoach AI - Database Migration Runner');
  console.log('============================================');
  console.log('');

  try {
    // Ensure migrations table exists
    await ensureMigrationsTable();
    console.log('📋 Migrations table ready');
    console.log('');

    // Get list of migration files
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No migration files found.');
      return;
    }

    console.log(`Found ${files.length} migration file(s):`);
    files.forEach(f => console.log(`  - ${f}`));
    console.log('');

    // Get already applied migrations
    const applied = await getAppliedMigrations();
    console.log(`Already applied: ${applied.length} migration(s)`);
    console.log('');

    // Apply pending migrations
    const pending = files.filter(f => !applied.includes(f));

    if (pending.length === 0) {
      console.log('✨ All migrations already applied. Database is up to date.');
      return;
    }

    console.log(`Pending migrations: ${pending.length}`);
    console.log('');

    let successCount = 0;
    let failCount = 0;

    for (const filename of pending) {
      const filepath = path.join(MIGRATIONS_DIR, filename);
      const sql = fs.readFileSync(filepath, 'utf8');
      
      const success = await applyMigration(filename, sql);
      if (success) {
        successCount++;
      } else {
        failCount++;
        // Stop on first failure
        console.log('');
        console.log('⚠️  Migration stopped due to error. Fix the issue and re-run.');
        break;
      }
    }

    console.log('');
    console.log('============================================');
    console.log(`  Results: ${successCount} applied, ${failCount} failed`);
    console.log('============================================');
    console.log('');

  } catch (error) {
    console.error('Migration runner error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Check for rollback flag
const isRollback = process.argv.includes('--rollback');

if (isRollback) {
  console.log('⚠️  Rollback mode not yet implemented.');
  console.log('    To rollback, manually run the DOWN migration SQL.');
  process.exit(0);
} else {
  runMigrations();
}
