/**
 * Firebase Configuration (MOCK FOR EXPO GO)
 * Bypasses native dependencies to allow running in standard Expo Go client
 */

// MOCK IMPLEMENTATION
const mockLog = (msg: string) => console.log(`[Firebase Mock] ${msg}`);

export const initializeFirebase = async () => {
  mockLog('Initialized (Mock)');
  return true;
};

export const logEvent = async (name: string, params?: any) => {
  mockLog(`Event: ${name} ${JSON.stringify(params || {})}`);
};

export const setUser = async (id: string) => {
  mockLog(`Set User: ${id}`);
};

export const clearUser = async () => {
  mockLog('Clear User');
};

export const getAuth = () => {
  return {}; // Return empty object as mock auth
};

export const recordError = (error: Error) => {
  console.error('[Firebase Mock Error]', error);
};

export default {
  initializeFirebase,
  logEvent,
  setUser,
  clearUser,
  getAuth,
  recordError
};
