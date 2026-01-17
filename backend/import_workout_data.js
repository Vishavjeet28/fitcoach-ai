const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'fitcoach',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const exercises = [
  { name: 'Bench Press', category: 'strength', equipment: 'barbell', muscle_group: 'chest', difficulty_level: 'intermediate', met_value: 5.0 },
  { name: 'Incline Dumbbell Press', category: 'strength', equipment: 'dumbbell', muscle_group: 'chest', difficulty_level: 'intermediate', met_value: 4.8 },
  { name: 'Push-Up', category: 'strength', equipment: 'bodyweight', muscle_group: 'chest', difficulty_level: 'beginner', met_value: 3.8 },
  { name: 'Chest Fly (Dumbbell)', category: 'strength', equipment: 'dumbbell', muscle_group: 'chest', difficulty_level: 'intermediate', met_value: 4.0 },
  { name: 'Pull-Up', category: 'strength', equipment: 'bodyweight', muscle_group: 'back', difficulty_level: 'advanced', met_value: 6.0 },
  { name: 'Lat Pulldown', category: 'strength', equipment: 'machine', muscle_group: 'back', difficulty_level: 'beginner', met_value: 4.5 },
  { name: 'Barbell Row', category: 'strength', equipment: 'barbell', muscle_group: 'back', difficulty_level: 'intermediate', met_value: 5.5 },
  { name: 'Seated Cable Row', category: 'strength', equipment: 'machine', muscle_group: 'back', difficulty_level: 'intermediate', met_value: 4.8 },
  { name: 'Squat', category: 'strength', equipment: 'barbell', muscle_group: 'legs', difficulty_level: 'intermediate', met_value: 6.5 },
  { name: 'Leg Press', category: 'strength', equipment: 'machine', muscle_group: 'legs', difficulty_level: 'beginner', met_value: 5.0 },
  { name: 'Romanian Deadlift', category: 'strength', equipment: 'barbell', muscle_group: 'legs', difficulty_level: 'intermediate', met_value: 5.8 },
  { name: 'Walking Lunges', category: 'strength', equipment: 'dumbbell', muscle_group: 'legs', difficulty_level: 'beginner', met_value: 4.2 },
  { name: 'Overhead Press', category: 'strength', equipment: 'barbell', muscle_group: 'shoulders', difficulty_level: 'intermediate', met_value: 5.2 },
  { name: 'Lateral Raise', category: 'strength', equipment: 'dumbbell', muscle_group: 'shoulders', difficulty_level: 'beginner', met_value: 3.5 },
  { name: 'Front Raise', category: 'strength', equipment: 'dumbbell', muscle_group: 'shoulders', difficulty_level: 'beginner', met_value: 3.5 },
  { name: 'Barbell Curl', category: 'strength', equipment: 'barbell', muscle_group: 'biceps', difficulty_level: 'beginner', met_value: 3.8 },
  { name: 'Hammer Curl', category: 'strength', equipment: 'dumbbell', muscle_group: 'biceps', difficulty_level: 'beginner', met_value: 3.8 },
  { name: 'Triceps Pushdown', category: 'strength', equipment: 'machine', muscle_group: 'triceps', difficulty_level: 'beginner', met_value: 4.0 },
  { name: 'Skull Crushers', category: 'strength', equipment: 'barbell', muscle_group: 'triceps', difficulty_level: 'intermediate', met_value: 4.2 },
  { name: 'Plank', category: 'core', equipment: 'bodyweight', muscle_group: 'core', difficulty_level: 'beginner', met_value: 3.0 },
  { name: 'Hanging Leg Raise', category: 'core', equipment: 'bodyweight', muscle_group: 'core', difficulty_level: 'advanced', met_value: 4.0 },
  { name: 'Russian Twist', category: 'core', equipment: 'bodyweight', muscle_group: 'core', difficulty_level: 'beginner', met_value: 4.0 },
  { name: 'Sit-Up', category: 'core', equipment: 'bodyweight', muscle_group: 'core', difficulty_level: 'beginner', met_value: 3.8 },
  { name: 'Treadmill Running (moderate)', category: 'cardio', equipment: 'treadmill', muscle_group: 'cardio', difficulty_level: 'intermediate', met_value: 8.0 },
  { name: 'Stationary Cycling (moderate)', category: 'cardio', equipment: 'machine', muscle_group: 'cardio', difficulty_level: 'beginner', met_value: 7.0 },
  { name: 'Jump Rope', category: 'cardio', equipment: 'bodyweight', muscle_group: 'cardio', difficulty_level: 'advanced', met_value: 10.0 },
  { name: 'Rowing Machine (moderate)', category: 'cardio', equipment: 'machine', muscle_group: 'cardio', difficulty_level: 'intermediate', met_value: 7.5 },
];

async function importExercises() {
  const client = await pool.connect();
  
  try {
    console.log('🏋️ Starting workout data import...\n');
    
    // Check if exercises table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'exercises'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.error('❌ Exercises table does not exist!');
      console.log('Please run migrations first: node run_migrations.js');
      return;
    }
    
    console.log('✅ Exercises table found\n');
    
    // Check current count
    const countBefore = await client.query('SELECT COUNT(*) FROM exercises');
    console.log(`📊 Current exercises in database: ${countBefore.rows[0].count}\n`);
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const exercise of exercises) {
      try {
        // Check if exercise already exists
        const existCheck = await client.query(
          'SELECT id FROM exercises WHERE name = $1',
          [exercise.name]
        );
        
        if (existCheck.rows.length > 0) {
          console.log(`⏭️  Skipped: "${exercise.name}" (already exists)`);
          skipped++;
          continue;
        }
        
        // Insert new exercise
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
          [exercise.equipment], // Array for equipment_needed
          [exercise.muscle_group], // Array for muscle_groups
          exercise.difficulty_level,
          exercise.met_value
        ]);
        
        console.log(`✅ Imported: "${exercise.name}" (${exercise.category}, ${exercise.difficulty_level})`);
        imported++;
        
      } catch (err) {
        console.error(`❌ Error importing "${exercise.name}":`, err.message);
        errors++;
      }
    }
    
    // Final count
    const countAfter = await client.query('SELECT COUNT(*) FROM exercises');
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully imported: ${imported} exercises`);
    console.log(`⏭️  Skipped (duplicates): ${skipped} exercises`);
    console.log(`❌ Errors: ${errors} exercises`);
    console.log(`📈 Total exercises in database: ${countAfter.rows[0].count}`);
    console.log('='.repeat(60));
    
    if (imported > 0) {
      console.log('\n🎉 Workout data imported successfully!\n');
      
      // Show sample of imported exercises
      const sample = await client.query(`
        SELECT name, category, difficulty_level, met_value 
        FROM exercises 
        ORDER BY id DESC 
        LIMIT 5
      `);
      
      console.log('📋 Latest exercises in database:');
      sample.rows.forEach((row, idx) => {
        console.log(`${idx + 1}. ${row.name} (${row.category}, ${row.difficulty_level}, MET: ${row.met_value})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run import
importExercises()
  .then(() => {
    console.log('\n✅ Import process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Import process failed:', error);
    process.exit(1);
  });
