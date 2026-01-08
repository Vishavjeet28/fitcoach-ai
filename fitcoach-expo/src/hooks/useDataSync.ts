/**
 * Data Sync Hook
 * PRODUCTION HARDENED - Ensures data consistency after mutations
 * 
 * Usage:
 *   const { forceRefresh, onPostSuccess } = useDataSync();
 *   
 *   // After POST/PUT/DELETE:
 *   await api.createFoodLog(data);
 *   onPostSuccess(); // Forces refetch of all data
 */

import { useState, useCallback } from 'react';

interface UseDataSyncReturn {
  /**
   * Trigger to force data refetch
   * Increment this value to trigger useEffect dependencies
   */
  refreshTrigger: number;
  
  /**
   * Force all data to refresh
   * Call after POST/PUT/DELETE operations
   */
  forceRefresh: () => void;
  
  /**
   * Call after successful POST operation
   * Adds a small delay to ensure backend has processed the change
   */
  onPostSuccess: () => void;
  
  /**
   * Check if a refresh is in progress
   */
  isRefreshing: boolean;
}

export const useDataSync = (): UseDataSyncReturn => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const forceRefresh = useCallback(() => {
    console.log('[DataSync] Forcing data refresh...');
    setIsRefreshing(true);
    setRefreshTrigger((prev) => prev + 1);
    
    // Reset refreshing state after a short delay
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  }, []);

  const onPostSuccess = useCallback(() => {
    console.log('[DataSync] POST successful, scheduling refresh...');
    
    // Wait 500ms for backend to process, then refresh
    setTimeout(() => {
      forceRefresh();
    }, 500);
  }, [forceRefresh]);

  return {
    refreshTrigger,
    forceRefresh,
    onPostSuccess,
    isRefreshing,
  };
};

/**
 * Example Usage in a Screen:
 * 
 * const { refreshTrigger, onPostSuccess } = useDataSync();
 * 
 * // Fetch data with dependency on refreshTrigger
 * useEffect(() => {
 *   fetchData();
 * }, [refreshTrigger]);
 * 
 * // After mutation
 * const handleAddFood = async () => {
 *   await api.food.create(data);
 *   onPostSuccess(); // Will trigger refetch after 500ms
 * };
 */

export default useDataSync;
