import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'fitcoach',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function importExercisesFromCSV() {
  const client = await pool.connect();
  
  try {
    console.log('🏋️ Starting workout data import from CSV...\n');
    
    // Check if exercises table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'exercises'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.error('❌ Exercises table does not exist!');
      return;
    }
    
    // Path to CSV file
    const csvPath = path.join(__dirname, '..', 'workout data', 'workout_exercises.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error(`❌ CSV file not found at: ${csvPath}`);
      return;
    }

    console.log(`📖 Reading CSV from: ${csvPath}`);
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length < 2) {
      console.log('⚠️ No data found in CSV.');
      return;
    }

    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim());
    const dataRows = lines.slice(1);
    
    console.log(`Found ${dataRows.length} exercises to process.`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const row of dataRows) {
      // Simple CSV parsing (assuming no commas within fields for now based on file preview)
      // Robust solution would use a library, but this fits the viewed data
      const values = row.split(',').map(v => v.trim());
      
      if (values.length !== headers.length) {
        console.warn(`⚠️ Skipping malformed row: ${row}`);
        errors++;
        continue;
      }

      const exercise = {};
      headers.forEach((header, index) => {
        exercise[header] = values[index];
      });

      try {
        // Check if exercise already exists
        const existCheck = await client.query(
          'SELECT id FROM exercises WHERE name = $1',
          [exercise.name]
        );
        
        if (existCheck.rows.length > 0) {
          // console.log(`⏭️  Skipped: "${exercise.name}" (already exists)`);
          skipped++;
          continue;
        }
        
        // Insert new exercise
        // Check what columns are in CSV: name,category,equipment,muscle_group,difficulty_level,met_value
        await client.query(`
          INSERT INTO exercises (
            name, 
            category, 
            equipment_needed, 
            muscle_groups, 
            difficulty_level, 
            met_value
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          exercise.name,
          exercise.category,
          [exercise.equipment], // Wrap in array as per schema expectation
          [exercise.muscle_group], // Wrap in array
          exercise.difficulty_level,
          parseFloat(exercise.met_value)
        ]);

        console.log(`✅ Imported: "${exercise.name}"`);
        imported++;
      } catch (err) {
        console.error(`❌ Error importing "${exercise.name}":`, err.message);
        errors++;
      }
    }
    
    console.log('\n----------------------------------------');
    console.log(`🎉 Import Summary:`);
    console.log(`   ✅ Imported: ${imported}`);
    console.log(`   ⏭️  Skipped:  ${skipped}`);
    console.log(`   ❌ Errors:   ${errors}`);
    console.log('----------------------------------------\n');

  } catch (error) {
    console.error('❌ Fatal error during import:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

importExercisesFromCSV();
