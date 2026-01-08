import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'fitcoach.db');

// Initialize SQL.js
const SQL = await initSqlJs();
let db;

if (existsSync(dbPath)) {
  const buffer = readFileSync(dbPath);
  db = new SQL.Database(buffer);
} else {
  db = new SQL.Database();
}

// Helper function to save database
const saveDB = () => {
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(dbPath, buffer);
};

// Wrapper functions to mimic better-sqlite3 API
const dbWrapper = {
  prepare: (sql) => {
    return {
      run: (...params) => {
        try {
          db.run(sql, params);
          const lastIdResult = db.exec('SELECT last_insert_rowid() as id');
          const lastId = lastIdResult[0]?.values[0]?.[0] || 0;
          saveDB();
          return { 
            changes: 1, // sql.js doesn't track row modifications the same way
            lastInsertRowid: lastId
          };
        } catch (error) {
          console.error('SQL Error:', error, 'Query:', sql, 'Params:', params);
          throw error;
        }
      },
      get: (...params) => {
        try {
          const result = db.exec(sql, params);
          if (result.length === 0) return undefined;
          const columns = result[0].columns;
          const values = result[0].values[0];
          if (!values) return undefined;
          const row = {};
          columns.forEach((col, i) => {
            row[col] = values[i];
          });
          return row;
        } catch (error) {
          console.error('SQL Error:', error, 'Query:', sql, 'Params:', params);
          throw error;
        }
      },
      all: (...params) => {
        try {
          const result = db.exec(sql, params);
          if (result.length === 0) return [];
          const columns = result[0].columns;
          const values = result[0].values;
          return values.map(row => {
            const obj = {};
            columns.forEach((col, i) => {
              obj[col] = row[i];
            });
            return obj;
          });
        } catch (error) {
          console.error('SQL Error:', error, 'Query:', sql, 'Params:', params);
          throw error;
        }
      }
    };
  },
  exec: (sql) => {
    try {
      db.run(sql);
      saveDB();
    } catch (error) {
      console.error('SQL Error:', error, 'Query:', sql);
      throw error;
    }
  }
};

const dbExport = dbWrapper;

// Create tables
const initDB = () => {
  // Users table
  dbExport.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      weight REAL,
      height REAL,
      calorie_target INTEGER DEFAULT 2700,
      goal TEXT DEFAULT 'Maintain weight',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Chat messages table
  dbExport.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      macros_kcal INTEGER,
      macros_protein REAL,
      macros_carbs REAL,
      macros_fat REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Meals table
  dbExport.exec(`
    CREATE TABLE IF NOT EXISTS meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      calories INTEGER NOT NULL,
      protein REAL NOT NULL,
      carbs REAL NOT NULL,
      fat REAL NOT NULL,
      meal_type TEXT,
      logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Workouts table
  dbExport.exec(`
    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      duration INTEGER,
      calories_burned INTEGER,
      workout_type TEXT,
      logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Water intake table
  dbExport.exec(`
    CREATE TABLE IF NOT EXISTS water_intake (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Recipes table
  dbExport.exec(`
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      calories INTEGER NOT NULL,
      protein REAL NOT NULL,
      carbs REAL NOT NULL,
      fat REAL NOT NULL,
      time_minutes INTEGER,
      servings INTEGER,
      ingredients TEXT,
      instructions TEXT,
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default user if not exists
  const userExists = dbExport.prepare('SELECT id FROM users WHERE email = ?').get('alex@example.com');
  if (!userExists) {
    dbExport.prepare(`
      INSERT INTO users (email, name, weight, height, calorie_target, goal)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('alex@example.com', 'Alex Johnson', 75, 175, 2700, 'Lose weight');
  }

  // Insert some default recipes if not exists
  const recipeCount = dbExport.prepare('SELECT COUNT(*) as count FROM recipes').get();
  if (recipeCount && recipeCount.count === 0) {
    const insertRecipe = dbExport.prepare(`
      INSERT INTO recipes (name, calories, protein, carbs, fat, time_minutes, servings, category, ingredients, instructions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const recipes = [
      ['High Protein Dal', 280, 18, 35, 8, 25, 2, 'High Protein', 'Lentils, Turmeric, Cumin, Garlic, Tomatoes', 'Boil lentils with spices until soft'],
      ['Paneer Tikka Bowl', 420, 28, 30, 22, 30, 1, 'High Protein', 'Paneer, Yogurt, Spices, Vegetables', 'Marinate paneer and grill'],
      ['Egg Bhurji', 220, 16, 5, 15, 10, 1, 'Quick Meals', 'Eggs, Onions, Tomatoes, Spices', 'Scramble eggs with vegetables'],
      ['Chicken Curry', 380, 32, 20, 18, 40, 3, 'High Protein', 'Chicken, Curry spices, Tomatoes, Onions', 'Cook chicken with curry sauce'],
      ['Greek Yogurt Bowl', 180, 15, 20, 5, 5, 1, 'Quick Meals', 'Greek yogurt, Berries, Honey, Granola', 'Mix all ingredients']
    ];

    recipes.forEach(recipe => insertRecipe.run(...recipe));
  }

  console.log('✅ Database initialized successfully');
};

initDB();

export default dbExport;
