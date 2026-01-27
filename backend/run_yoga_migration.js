/**
 * run_yoga_migration.js
 * 
 * Script to apply yoga schema v2 and seed data
 * Usage: node run_yoga_migration.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'fitcoach_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('🚀 Starting Yoga Schema Migration v2...\n');

        // Step 1: Apply Schema
        console.log('📋 Step 1: Applying schema...');
        const schemaPath = path.join(__dirname, 'src/migrations/yoga_schema_v2.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        await client.query(schemaSql);
        console.log('   ✅ Schema applied successfully\n');

        // Step 2: Apply Seed Data
        console.log('🌱 Step 2: Seeding data...');
        const seedPath = path.join(__dirname, 'src/migrations/yoga_seed_v2.sql');
        const seedSql = fs.readFileSync(seedPath, 'utf8');

        await client.query(seedSql);
        console.log('   ✅ Seed data applied successfully\n');

        // Step 3: Verify
        console.log('🔍 Step 3: Verifying...');

        const catCount = await client.query('SELECT COUNT(*) FROM yoga_categories');
        console.log(`   📂 Categories: ${catCount.rows[0].count}`);

        const exCount = await client.query('SELECT COUNT(*) FROM yoga_exercises');
        console.log(`   🧘 Exercises: ${exCount.rows[0].count}`);

        const detailCount = await client.query('SELECT COUNT(*) FROM yoga_exercise_details');
        console.log(`   📝 Exercise Details: ${detailCount.rows[0].count}`);

        // Show categories
        console.log('\n📋 Categories loaded:');
        const cats = await client.query('SELECT id, name FROM yoga_categories ORDER BY display_order');
        cats.rows.forEach((c, i) => console.log(`   ${i + 1}. ${c.name} (${c.id})`));

        // Show exercise count per category
        console.log('\n📊 Exercises per category:');
        const perCat = await client.query(`
            SELECT c.name, COUNT(e.id) as count 
            FROM yoga_categories c 
            LEFT JOIN yoga_exercises e ON c.id = e.category_id 
            GROUP BY c.id, c.name, c.display_order
            ORDER BY c.display_order
        `);
        perCat.rows.forEach(r => console.log(`   ${r.name}: ${r.count}`));

        console.log('\n✅ Migration completed successfully!');
        console.log('\n📖 Next steps:');
        console.log('   1. Restart the backend server');
        console.log('   2. Test: GET /api/yoga/categories');
        console.log('   3. Test: GET /api/yoga/exercises');

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
