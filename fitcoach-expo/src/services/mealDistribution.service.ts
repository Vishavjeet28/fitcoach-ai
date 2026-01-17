import apiClient from './api';

export interface Macros {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

export interface MealPlan {
    breakfast: Macros;
    lunch: Macros;
    dinner: Macros;
}

export interface MealDistributionResponse {
    meta: {
        date: string;
        goal_style: 'balanced' | 'aggressive' | 'conservative';
        meal_style: 'fixed';
    };
    meals: MealPlan;
}

export const MealDistributionService = {
    /**
     * Get the daily meal distribution.
     * If not calculated yet, the backend will generate it based on current targets.
     */
    getDailyDistribution: async (): Promise<MealDistributionResponse> => {
        const response = await apiClient.get('/meals/daily');
        return response.data;
    },

    /**
     * Recalculate the distribution with new parameters.
     */
    recalculate: async (
        goal_style: 'balanced' | 'aggressive' | 'conservative',
        meal_style: 'fixed' = 'fixed'
    ): Promise<MealDistributionResponse> => {
        const response = await apiClient.post('/meals/recalculate', {
            goal_style,
            meal_style
        });
        return response.data;
    }
};
