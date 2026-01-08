# Food Database Feature 🍽️

## Overview
The FitCoach app now includes a comprehensive Indian food database with **50+ common foods** and their complete nutritional information.

## Features ✨

### 1. **Searchable Food Database**
- Search through 50+ Indian foods
- Real-time search results
- Popular foods displayed by default (Roti, Chapati, Dal, Idli, Dosa, etc.)

### 2. **Auto-Fill Nutritional Information**
When you select a food from the database:
- ✅ **Calories** automatically calculated
- ✅ **Protein** content filled
- ✅ **Carbs** content filled
- ✅ **Fat** content filled

### 3. **Smart Serving Size Calculator**
- All nutrition data is per 100g
- Change serving size → nutrition automatically recalculates
- Example: Select "Roti" (297 kcal/100g)
  - Enter 50g → Shows 148.5 kcal
  - Enter 200g → Shows 594 kcal

### 4. **Manual Entry Option**
- Don't find your food? Enter it manually
- All fields editable when not using database

## How to Use 🎯

### Method 1: Search Database (Recommended)
1. Open Food Log screen
2. Type food name in search bar (e.g., "roti", "dal", "biryani")
3. Tap on food from results
4. Adjust serving size if needed (default: 100g)
5. Nutrition automatically fills
6. Save!

### Method 2: Manual Entry
1. Skip the search
2. Enter food name manually
3. Enter serving size, calories, macros
4. Save!

## Database Contents 📊

### Categories Included:
- **Roti/Bread**: Roti, Chapati, Paratha, Naan
- **Rice**: Plain, Brown, Jeera, Curd, Lemon, Tamarind Rice
- **Dals**: Toor, Moong, Masoor, Urad, Chana Dal
- **Vegetables**: Aloo, Bhindi, Palak, Karela, Gobhi Sabzi
- **South Indian**: Idli, Dosa, Vada, Uttapam, Pongal
- **Street Food**: Pav Bhaji, Vada Pav, Bhel Puri, Pani Puri, Samosa
- **Curries**: Paneer Tikka, Butter Chicken, Dal Makhani, Rajma, Chole
- **Snacks**: Poha, Upma, Dhokla, Pakora
- **Sweets**: Gulab Jamun, Rasgulla, Ladoo, Barfi
- **More**: Khichdi, and many more!

## Nutritional Data Format 📋

All values are per 100g serving:
```
{
  "name": "Roti",
  "calories": 297,    // kcal per 100g
  "protein": 11.0,    // grams per 100g
  "carbs": 61.0,      // grams per 100g
  "fat": 2.0          // grams per 100g
}
```

## Example Use Cases 💡

### Example 1: Log 2 Rotis
1. Search "Roti"
2. Select from results (297 kcal/100g shown)
3. Change serving size to "150g" (approx 2 rotis)
4. Auto-calculates: 445 kcal, 16.5g protein, 91.5g carbs, 3g fat
5. Save!

### Example 2: Log 1 Bowl Dal
1. Search "Toor Dal"
2. Select from results
3. Enter serving size "200g" (1 bowl)
4. Auto-calculates: 250 kcal, 15g protein, 46g carbs, 6g fat
5. Save!

### Example 3: Log Custom Food
1. Don't search, directly enter name
2. Enter "Homemade Khichdi"
3. Enter serving size and nutrition manually
4. Save!

## Technical Details 🔧

### File Structure:
```
src/
  data/
    indianFoodDatabase.json  // Food database
  screens/
    FoodLogScreen.tsx        // Search & logging UI
```

### How Calculation Works:
```typescript
// User selects "Roti" (297 kcal per 100g)
// User enters serving size: 150g

multiplier = 150 / 100 = 1.5
calories = 297 * 1.5 = 445.5 kcal
protein = 11.0 * 1.5 = 16.5g
carbs = 61.0 * 1.5 = 91.5g
fat = 2.0 * 1.5 = 3.0g
```

## Benefits 🎉

1. **Accuracy**: Pre-loaded nutritional data for common Indian foods
2. **Speed**: No need to look up nutrition info online
3. **Convenience**: Just search → tap → adjust serving → save
4. **Flexibility**: Can still manually enter any food
5. **Smart**: Auto-recalculates when you change serving size

## Future Enhancements 🚀

Potential improvements:
- [ ] Barcode scanner integration
- [ ] Photo recognition for food
- [ ] User-submitted foods
- [ ] Recipe builder
- [ ] Meal templates
- [ ] More food categories (International, Fast Food, Beverages)
- [ ] Portion size presets (1 cup, 1 bowl, 1 piece)
- [ ] Favorites/Recent foods

## Data Source 📚

Nutritional data aggregated from:
- Indian Food Composition Tables (IFCT)
- USDA FoodData Central
- Averaged for accuracy

---

**Note**: This is exactly like MyNetDiary app - search food, tap to select, nutrition auto-fills!
