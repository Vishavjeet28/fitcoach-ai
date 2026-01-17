
import dotenv from 'dotenv';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const RECIPES = [
    {
        name: "Grilled Chicken & Avocado Salad",
        brand: "FitCoach Kitchen",
        calories: 450,
        protein: 45,
        carbs: 12,
        fat: 22,
        serving_size: 1,
        serving_unit: "bowl",
        category: "Lunch",
        description: "A fresh and high-protein salad perfect for post-workout recovery.",
        prep_time_minutes: 15,
        cook_time_minutes: 10,
        instructions: [
            "Season chicken breast with salt, pepper, and oregano.",
            "Grill chicken for 5-6 mins per side until cooked.",
            "Chop lettuce, cucumber, and cherry tomatoes.",
            "Slice avocado.",
            "Mix olive oil and lemon juice for dressing.",
            "Toss salad with dressing and top with sliced chicken."
        ],
        ingredients: [
            { name: "Chicken Breast", amount: "150g" },
            { name: "Avocado", amount: "1/2" },
            { name: "Mixed Greens", amount: "2 cups" },
            { name: "Cherry Tomatoes", amount: "5" }
        ],
        image_url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
        dietary_tags: ["high-protein", "low-carb", "gluten-free"]
    },
    {
        name: "Overnight Oats with Berries",
        brand: "FitCoach Kitchen",
        calories: 350,
        protein: 12,
        carbs: 55,
        fat: 6,
        serving_size: 1,
        serving_unit: "jar",
        category: "Breakfast",
        description: "Prepare this the night before for a hassle-free morning.",
        prep_time_minutes: 5,
        cook_time_minutes: 0,
        instructions: [
            "In a jar, mix oats, milk, and chia seeds.",
            "Stir well to combine.",
            "Top with frozen or fresh berries.",
            "Refrigerate overnight (at least 6 hours).",
            "Enjoy cold in the morning."
        ],
        ingredients: [
            { name: "Rolled Oats", amount: "1/2 cup" },
            { name: "Almond Milk", amount: "1/2 cup" },
            { name: "Chia Seeds", amount: "1 tsp" },
            { name: "Mixed Berries", amount: "1/2 cup" }
        ],
        image_url: "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?auto=format&fit=crop&w=800&q=80",
        dietary_tags: ["vegan", "vegetarian", "high-fiber"]
    },
    {
        name: "Pan-Seared Salmon with Asparagus",
        brand: "FitCoach Kitchen",
        calories: 520,
        protein: 38,
        carbs: 8,
        fat: 34,
        serving_size: 1,
        serving_unit: "plate",
        category: "Dinner",
        description: "Rich in Omega-3 fatty acids and quick to prepare.",
        prep_time_minutes: 10,
        cook_time_minutes: 15,
        instructions: [
            "Season salmon fillet with salt, pepper, and lemon zest.",
            "Heat olive oil in a pan over medium-high heat.",
            "Place salmon skin-side down and cook for 4-5 mins until crispy.",
            "Flip and cook for another 2-3 mins.",
            "In the same pan, sauté asparagus with garlic for 5 mins.",
            "Serve salmon with asparagus and a lemon wedge."
        ],
        ingredients: [
            { name: "Salmon Fillet", amount: "150g" },
            { name: "Asparagus", amount: "10 spears" },
            { name: "Olive Oil", amount: "1 tbsp" },
            { name: "Garlic", amount: "1 clove" }
        ],
        image_url: "https://images.unsplash.com/photo-1467003909585-2f8a7270028d?auto=format&fit=crop&w=800&q=80",
        dietary_tags: ["keto", "high-protein", "gluten-free"]
    },
    {
        name: "Classic Avocado Toast with Egg",
        brand: "FitCoach Kitchen",
        calories: 420,
        protein: 18,
        carbs: 35,
        fat: 22,
        serving_size: 2,
        serving_unit: "toasts",
        category: "Breakfast",
        description: "A balanced breakfast with healthy fats and protein.",
        prep_time_minutes: 10,
        cook_time_minutes: 5,
        instructions: [
            "Toast whole grain bread slices.",
            "Mash avocado with salt, pepper, and lime juice.",
            "Spread avocado mash onto toast.",
            "Fry or poach an egg to your liking.",
            "Place egg on top and sprinkle with chili flakes."
        ],
        ingredients: [
            { name: "Whole Grain Bread", amount: "2 slices" },
            { name: "Avocado", amount: "1/2" },
            { name: "Egg", amount: "1 large" },
            { name: "Lime Juice", amount: "1 tsp" }
        ],
        image_url: "https://images.unsplash.com/photo-1525351484163-7529414395d8?auto=format&fit=crop&w=800&q=80",
        dietary_tags: ["vegetarian", "balanced"]
    },
    {
        name: "Beef and Broccoli Stir-Fry",
        brand: "FitCoach Kitchen",
        calories: 480,
        protein: 42,
        carbs: 25,
        fat: 18,
        serving_size: 1,
        serving_unit: "bowl",
        category: "Dinner",
        description: "Better than takeout - lean beef with crunchy broccoli.",
        prep_time_minutes: 20,
        cook_time_minutes: 10,
        instructions: [
            "Slice beef into thin strips.",
            "Mix soy sauce, ginger, and garlic for sauce.",
            "Stir-fry beef in hot pan for 2 mins, remove.",
            "Stir-fry broccoli florets with a splash of water for 3 mins.",
            "Add beef back in, pour sauce over, and toss to coat.",
            "Serve over rice or cauliflower rice (macros for beef + broccoli only)."
        ],
        ingredients: [
            { name: "Flank Steak", amount: "150g" },
            { name: "Broccoli", amount: "2 cups" },
            { name: "Soy Sauce", amount: "2 tbsp" },
            { name: "Ginger", amount: "1 tsp" }
        ],
        image_url: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80",
        dietary_tags: ["high-protein", "dairy-free"]
    },
    {
        name: "Quinoa Vegetable Bowl using Quinoa",
        brand: "FitCoach Kitchen",
        calories: 380,
        protein: 14,
        carbs: 58,
        fat: 10,
        serving_size: 1,
        serving_unit: "bowl",
        category: "Lunch",
        description: "Nutrient-dense vegan bowl packed with fiber.",
        prep_time_minutes: 15,
        cook_time_minutes: 20,
        instructions: [
            "Cook quinoa according to package instructions.",
            "Roast cubed sweet potato and chickpeas in oven for 20 mins.",
            "Assemble bowl with quinoa base, roasted veggies, and fresh spinach.",
            "Drizzle with tahini dressing."
        ],
        ingredients: [
            { name: "Quinoa (cooked)", amount: "1 cup" },
            { name: "Sweet Potato", amount: "1 medium" },
            { name: "Chickpeas", amount: "1/2 cup" },
            { name: "Spinach", amount: "1 cup" }
        ],
        image_url: "https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=800&q=80",
        dietary_tags: ["vegan", "plant-based", "high-fiber"]
    },
    {
        name: "Greek Yogurt Parfait",
        brand: "FitCoach Kitchen",
        calories: 250,
        protein: 20,
        carbs: 28,
        fat: 4,
        serving_size: 1,
        serving_unit: "cup",
        category: "Snack",
        description: "High protein snack to keep you full.",
        prep_time_minutes: 5,
        cook_time_minutes: 0,
        instructions: [
            "Spoon Greek yogurt into a bowl.",
            "Layer with granola and sliced banana.",
            "Drizzle with honey."
        ],
        ingredients: [
            { name: "Greek Yogurt (0%)", amount: "1 cup" },
            { name: "Granola", amount: "2 tbsp" },
            { name: "Banana", amount: "1/2" },
            { name: "Honey", amount: "1 tsp" }
        ],
        image_url: "https://images.unsplash.com/photo-1488477181946-6428a029177b?auto=format&fit=crop&w=800&q=80",
        dietary_tags: ["vegetarian", "high-protein"]
    },
    {
        name: "Banana Protein Smoothie",
        brand: "FitCoach Kitchen",
        calories: 300,
        protein: 25,
        carbs: 35,
        fat: 6,
        serving_size: 1,
        serving_unit: "glass",
        category: "Snack",
        description: "Perfect post-workout refuel.",
        prep_time_minutes: 5,
        cook_time_minutes: 0,
        instructions: [
            "Add banana, protein powder, milk, and peanut butter to blender.",
            "Blend until smooth.",
            "Add ice cubes if desired and blend again."
        ],
        ingredients: [
            { name: "Banana", amount: "1" },
            { name: "Whey Protein", amount: "1 scoop" },
            { name: "Almond Milk", amount: "1 cup" },
            { name: "Peanut Butter", amount: "1 tsp" }
        ],
        image_url: "https://images.unsplash.com/photo-1553531384-cc64ac80f931?auto=format&fit=crop&w=800&q=80",
        dietary_tags: ["high-protein", "vegetarian"]
    },
    {
        name: "Mediterranean Hummus Wrap",
        brand: "FitCoach Kitchen",
        calories: 380,
        protein: 12,
        carbs: 45,
        fat: 16,
        serving_size: 1,
        serving_unit: "wrap",
        category: "Lunch",
        description: "Easy vegetarian lunch on the go.",
        prep_time_minutes: 10,
        cook_time_minutes: 0,
        instructions: [
            "Lay tortilla flat.",
            "Spread hummus evenly.",
            "Top with cucumbers, tomatoes, olives, and feta.",
            "Roll up tight and slice in half."
        ],
        ingredients: [
            { name: "Whole Wheat Tortilla", amount: "1" },
            { name: "Hummus", amount: "3 tbsp" },
            { name: "Cucumber", amount: "1/4" },
            { name: "Feta Cheese", amount: "1 tbsp" }
        ],
        image_url: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=800&q=80",
        dietary_tags: ["vegetarian"]
    }
];

const seedRecipes = async () => {
    try {
        console.log('🌱 Starting recipe seed...');

        // Ensure table columns exist (simple check by selecting one)
        try {
            await pool.query('SELECT instructions FROM foods LIMIT 1');
        } catch (e) {
            console.warn('⚠️  Warning: "instructions" column might be missing. Please run migration 012 first.');
            // We continue, but insertion might fail if cols missing.
        }

        let added = 0;

        for (const r of RECIPES) {
            // Check if exists
            const check = await pool.query('SELECT id FROM foods WHERE name = $1', [r.name]);
            if (check.rows.length > 0) {
                console.log(`Skipping existing: ${r.name}`);
                continue;
            }

            await pool.query(
                `INSERT INTO foods (
            name, brand, calories, protein, carbs, fat, 
            serving_size, serving_unit, category, 
            description, prep_time_minutes, cook_time_minutes, 
            instructions, ingredients, image_url, dietary_tags,
            is_verified
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, TRUE)`,
                [
                    r.name, r.brand, r.calories, r.protein, r.carbs, r.fat,
                    r.serving_size, r.serving_unit, r.category,
                    r.description, r.prep_time_minutes, r.cook_time_minutes,
                    r.instructions, JSON.stringify(r.ingredients), r.image_url, r.dietary_tags
                ]
            );
            added++;
        }

        console.log(`✅ Successfully added ${added} new recipes!`);

    } catch (error) {
        console.error('❌ Reseeding failed:', error);
    } finally {
        await pool.end();
    }
};

seedRecipes();
