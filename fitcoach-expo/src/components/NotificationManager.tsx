import React, { useEffect, useRef } from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

export const NotificationManager: React.FC = () => {
    const { expoPushToken } = usePushNotifications();
    const { authStatus, user } = useAuth();
    const isSynced = useRef(false);

    useEffect(() => {
        const syncToken = async () => {
            if (authStatus === 'authenticated' && user && expoPushToken && !isSynced.current) {
                // Determine if we need to sync (optimization: check if user.push_token matches)
                if (user.push_token !== expoPushToken) {
                    try {
                        console.log('Syncing push token to backend...');
                        await authAPI.updateProfile({ push_token: expoPushToken });
                        isSynced.current = true;
                        console.log('Push token synced successfully');
                    } catch (error) {
                        console.error('Failed to sync push token', error);
                    }
                } else {
                    isSynced.current = true;
                }
            }
        };
        syncToken();
    }, [authStatus, user, expoPushToken]);

    return null;
};
