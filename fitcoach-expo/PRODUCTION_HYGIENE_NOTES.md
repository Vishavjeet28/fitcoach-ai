# Production Hygiene Checklist

## ✅ Completed

### 1. Logger Utility Created (`src/utils/logger.ts`)
- Wraps console.log to only output in development
- Always logs errors (for Crashlytics)
- Usage: `import logger from './utils/logger';`

### 2. Error Boundary Created (`src/components/ErrorBoundary.tsx`)
- Catches JavaScript crashes
- Displays user-friendly error screen
- Shows dev-only error details

### 3. Environment Configuration (`src/config/api.config.ts`)
- No hardcoded URLs (uses EXPO_PUBLIC_API_URL)
- Validates URLs on startup
- Clear error messages for missing config

## ⚠️  Remaining Tasks

### 1. Install Network Status Package
```bash
npm install @react-native-community/netinfo
```
Then use `src/utils/networkStatus.ts` for offline detection.

### 2. Remove ngrok Header from AuthContext
**File**: `src/context/AuthContext.tsx:55`
```typescript
// REMOVE THIS:
'ngrok-skip-browser-warning': 'true',
```

**Note**: AuthContext still uses fetch() directly instead of api.ts. This bypasses Axios hardening but was marked as "DO NOT MODIFY" in requirements. Consider refactoring after auth testing is complete.

### 3. Replace console.log with logger
Search and replace in key files:
- `src/services/aiService.ts` - Has many console.log statements
- `src/context/AuthContext.tsx` - Has authentication logs
- `src/screens/*.tsx` - Various screen logs

Example:
```typescript
// OLD:
console.log('🤖 [AI] Sending request');

// NEW:
import logger from '../utils/logger';
logger.log('🤖 [AI] Sending request');
```

### 4. Add Offline Banner Component
Create `src/components/OfflineBanner.tsx`:
```typescript
import { useNetworkStatus } from '../utils/networkStatus';

// Show banner when offline
const isOnline = useNetworkStatus();
if (!isOnline) {
  return <View><Text>You're offline</Text></View>;
}
```

Add to App.tsx after installing NetInfo.

### 5. Clean Up Commented Code
Files with commented code:
- Check all `src/screens/*.tsx` files
- Search for `//` blocks that are no longer needed

## 📋 Production Build Checklist

Before releasing to production:

1. ✅ Set EXPO_PUBLIC_API_URL to production API
2. ⚠️  Install @react-native-community/netinfo
3. ⚠️  Replace console.log with logger utility
4. ⚠️  Remove ngrok header from AuthContext
5. ⚠️  Add offline detection UI
6. ⚠️  Test ErrorBoundary (trigger a crash)
7. ⚠️  Verify no hardcoded URLs remain
8. ✅ All API calls use Axios (except AuthContext fetch calls)
9. ✅ Input validation on AI service
10. ✅ Rate limiting on AI calls

## 🚀 Quick Wins

Most critical for immediate production deployment:
1. Set `EXPO_PUBLIC_API_URL` environment variable
2. Test ErrorBoundary catches crashes
3. Verify API URL validation works

Optional but recommended:
1. Install NetInfo for offline detection
2. Replace console.logs with logger
3. Remove ngrok header
