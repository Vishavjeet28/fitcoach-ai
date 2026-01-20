import { query } from '../config/database.js';
import AIService from '../services/ai.service.js';

// Get recipes (from Foods table)
export const getRecipes = async (req, res) => {
    try {
        // We fetch verified recipes from the foods table
        // These serve as the "Recipe Collection"
        const result = await query(
            `SELECT id, name, description, ingredients, instructions, 
                    calories, protein, carbs, fat, 
                    prep_time_minutes as prep_time, 
                    cook_time_minutes as cook_time
             FROM foods 
             WHERE is_verified = TRUE 
             ORDER BY name ASC`
        );

        // Map data to match frontend expectations
        const recipes = result.rows.map(r => ({
            ...r,
            // Convert TEXT[] instructions to a single string
            instructions: Array.isArray(r.instructions) ? r.instructions.join('\n') : r.instructions,
            // Convert JSONB ingredients to a readable string if it's structured
            ingredients: Array.isArray(r.ingredients)
                ? r.ingredients.map(i => `${i.amount || ''} ${i.name}`).join(', ')
                : r.ingredients
        }));

        res.json({ recipes });
    } catch (error) {
        console.error('Get recipes error:', error);
        res.status(500).json({ error: 'Failed to fetch recipes' });
    }
};

// Generate a new recipe using AI
export const generateRecipe = async (req, res) => {
    try {
        const { prompt } = req.body;
        const userId = req.user.id;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        // We can use the existing AIService or a new specialized prompt
        const aiPrompt = `Generate a high-quality healthy recipe based on this request: "${prompt}".
        
        Format the response as JSON with EXACTLY these keys:
        {
            "name": "Recipe Name",
            "description": "Brief mouth-watering description",
            "ingredients": "Ingredient 1, Ingredient 2, ...",
            "instructions": "Step 1. Step 2. ...",
            "calories": 400,
            "protein": 30,
            "carbs": 40,
            "fat": 15,
            "prep_time": 15,
            "cook_time": 20
        }`;

        const aiResponse = await AIService.chat(aiPrompt, userId);

        // Extract JSON from AI response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('AI failed to generate a valid recipe JSON');
        }

        const recipeData = JSON.parse(jsonMatch[0]);

        // Save to foods table (marked as unverified and possibly linked to user if we had a column)
        // For now, we'll just return it to the frontend. 
        // If we want it to PERSIST in the collection, we should insert it.

        const insertResult = await query(
            `INSERT INTO foods (
                name, description, ingredients, instructions,
                calories, protein, carbs, fat,
                prep_time_minutes, cook_time_minutes,
                is_verified
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, FALSE)
            RETURNING id, name, description, ingredients, instructions, 
                      calories, protein, carbs, fat, 
                      prep_time_minutes as prep_time, 
                      cook_time_minutes as cook_time`,
            [
                recipeData.name,
                recipeData.description,
                JSON.stringify([{ name: recipeData.ingredients, amount: '' }]),
                recipeData.instructions.split('.').filter(s => s.trim()).map(s => s.trim()),
                recipeData.calories,
                recipeData.protein,
                recipeData.carbs,
                recipeData.fat,
                recipeData.prep_time,
                recipeData.cook_time
            ]
        );

        const newRecipe = {
            ...insertResult.rows[0],
            instructions: Array.isArray(insertResult.rows[0].instructions)
                ? insertResult.rows[0].instructions.join('\n')
                : insertResult.rows[0].instructions,
            ingredients: recipeData.ingredients
        };

        res.json({ recipe: newRecipe });
    } catch (error) {
        console.error('Generate recipe error:', error);
        res.status(500).json({ error: 'Failed to generate recipe' });
    }
};

// Delete a recipe
export const deleteRecipe = async (req, res) => {
    try {
        const { id } = req.params;

        // In a real app, only allow deleting if user created it.
        // For this demo, we'll allow deleting unverified recipes.
        const check = await query('SELECT is_verified FROM foods WHERE id = $1', [id]);

        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Recipe not found' });
        }

        if (check.rows[0].is_verified) {
            return res.status(403).json({ error: 'Cannot delete system-verified recipes' });
        }

        await query('DELETE FROM foods WHERE id = $1', [id]);
        res.json({ message: 'Recipe deleted' });
    } catch (error) {
        console.error('Delete recipe error:', error);
        res.status(500).json({ error: 'Failed to delete recipe' });
    }
};
