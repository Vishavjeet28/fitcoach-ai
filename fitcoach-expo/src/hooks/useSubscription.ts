import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { billingAPI } from '../services/api';

const FREE_AI_LIMIT = 5;

export const useSubscription = () => {
    const { user, isAuthenticated } = useAuth();
    
    // Local state for billing API data
    const [aiUsage, setAiUsage] = useState<{
        tier: string;
        used: number;
        remaining: number;
        limit: number;
        can_use_ai: boolean;
    } | null>(null);
    
    // Fetch AI usage from billing API
    const refreshAiUsage = useCallback(async () => {
        if (!isAuthenticated) return;
        
        try {
            const usage = await billingAPI.getAIUsage();
            setAiUsage(usage);
        } catch (error) {
            console.warn('Failed to fetch AI usage:', error);
        }
    }, [isAuthenticated]);
    
    useEffect(() => {
        refreshAiUsage();
    }, [refreshAiUsage]);
    
    // Derived state - prefer billing API data, fallback to user profile
    const tier = aiUsage?.tier || (user?.subscriptionStatus === 'pro' ? 'paid' : 'free');
    const isPro = tier === 'paid';
    const isFree = tier === 'free';
    const isGuest = tier === 'guest' || !isAuthenticated;
    
    const aiUsageCount = aiUsage?.used || user?.aiUsageCount || 0;
    const aiLimit = aiUsage?.limit || FREE_AI_LIMIT;
    const remainingAiCalls = aiUsage?.remaining ?? Math.max(0, aiLimit - aiUsageCount);
    
    // Check if limit reached
    const isAiLimitReached = aiUsage 
        ? !aiUsage.can_use_ai 
        : (isFree && aiUsageCount >= aiLimit);

    return {
        tier,
        isPro,
        isFree,
        isGuest,
        aiUsageCount,
        remainingAiCalls,
        isAiLimitReached,
        limit: aiLimit,
        refreshAiUsage,
    };
};
