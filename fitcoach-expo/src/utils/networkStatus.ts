/**
 * Network Status Utility
 * PRODUCTION HARDENED - Monitors network connectivity
 * 
 * Usage:
 * import { useNetworkStatus } from './utils/networkStatus';
 * 
 * const isOnline = useNetworkStatus();
 */

import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? true);
      
      if (__DEV__) {
        console.log('🌐 [NETWORK] Connection status:', state.isConnected ? 'Online' : 'Offline');
      }
    });

    return () => unsubscribe();
  }, []);

  return isOnline;
}

export async function checkInternetConnection(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  } catch (error) {
    console.error('❌ [NETWORK] Failed to check connection:', error);
    return false;
  }
}
