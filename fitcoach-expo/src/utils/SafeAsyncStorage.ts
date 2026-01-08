// In-memory fallback storage for Expo Go
// AsyncStorage native module is not available in Expo Go,
// so we use JavaScript object storage instead
const memoryStorage: { [key: string]: string } = {};

console.log('📦 Using in-memory storage (data will not persist across app restarts)');

// Safe AsyncStorage wrapper using in-memory storage
class SafeAsyncStorage {
  async getItem(key: string): Promise<string | null> {
    try {
      return memoryStorage[key] || null;
    } catch (error) {
      console.warn(`⚠️ Error getting item "${key}":`, error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      memoryStorage[key] = value;
    } catch (error) {
      console.warn(`⚠️ Error setting item "${key}":`, error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      delete memoryStorage[key];
    } catch (error) {
      console.warn(`⚠️ Error removing item "${key}":`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      Object.keys(memoryStorage).forEach(key => delete memoryStorage[key]);
    } catch (error) {
      console.warn('⚠️ Error clearing storage:', error);
    }
  }
}

export default new SafeAsyncStorage();
