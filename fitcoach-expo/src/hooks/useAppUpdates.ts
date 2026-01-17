import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

export const useAppUpdates = () => {
  const [isUpdateMatches, setIsUpdateMatches] = useState(false);

  async function onFetchUpdateAsync() {
    if (__DEV__) {
      // OTA updates don't work in dev mode
      return;
    }

    try {
      // Dynamic import to avoid crash in development if native module is missing (needs rebuild)
      const Updates = require('expo-updates');

      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        Alert.alert(
          'Update Available',
          'A new version of the app is available. Restart now to apply?',
          [
            { text: 'No', style: 'cancel' },
            {
              text: 'Yes',
              onPress: async () => {
                await Updates.reloadAsync();
              },
            },
          ]
        );
      }
    } catch (error) {
      // Fail silently in production, or log to analytics
      console.log(`Error fetching update: ${error}`);
    }
  }

  useEffect(() => {
    onFetchUpdateAsync();
  }, []);

  return { onFetchUpdateAsync };
};
