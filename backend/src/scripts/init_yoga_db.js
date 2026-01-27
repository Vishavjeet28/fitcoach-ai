import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    console.log('🧘 Starting Yoga Database Migration...');

    try {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Run Schema
            console.log('Building tables...');
            const schemaPath = path.join(__dirname, '../migrations/yoga_schema.sql');
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');
            await client.query(schemaSql);
            console.log('✅ Tables created successfully.');

            // 2. Run Seed (Optional check if empty first?)
            // For now, let's just insert. If items exist, names might crash unique constraints if we had them, 
            // but my seed SQL uses simple INSERTs. To avoid duplicates on re-runs, I should be careful.
            // But for this "first class" integration I assume fresh or I'll just catch duplicate errors.

            console.log('Seeding initial data...');
            const seedPath = path.join(__dirname, '../migrations/yoga_seed.sql');
            const seedSql = fs.readFileSync(seedPath, 'utf8');

            // We run seed only if sessions are empty to avoid duplicates
            const checkRes = await client.query('SELECT count(*) FROM yoga_sessions');
            if (parseInt(checkRes.rows[0].count) === 0) {
                await client.query(seedSql);
                console.log('✅ Seed data inserted.');
            } else {
                console.log('ℹ️ Yoga sessions already exist, skipping seed.');
            }

            await client.query('COMMIT');
            console.log('🎉 Yoga Module Database Ready!');

        } catch (e) {
            await client.query('ROLLBACK');
            console.error('❌ Migration Failed:', e);
            throw e;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error('Connection Error:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
