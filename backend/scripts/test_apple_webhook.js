
import jwt from 'jsonwebtoken';
import { processNotification } from '../src/services/appleStoreService.js';

const runTest = async () => {
  console.log('--- Starting Apple Webhook Test ---');

  // Set Bundle ID for test
  process.env.APPLE_BUNDLE_ID = 'com.fitcoach.app';

  // 1. Create Mock Transaction Info
  // Dates in Apple JWS are usually milliseconds since epoch or similar.
  // Let's use milliseconds for simplicity as our service converts new Date(expiresDate)
  const mockTransactionInfo = {
    originalTransactionId: '1000000999',
    transactionId: '2000000999',
    productId: 'com.fitcoach.pro.monthly',
    bundleId: 'com.fitcoach.app',
    purchaseDate: Date.now(),
    expiresDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // +30 days
    revocationDate: null
  };

  // Sign with a dummy secret (our service just decodes, doesn't verify signature yet)
  const signedTransactionInfo = jwt.sign(mockTransactionInfo, 'dummy_secret');

  // 2. Create Mock Payload
  const mockPayloadData = {
    notificationType: 'SUBSCRIBED',
    subtype: 'INITIAL_BUY',
    data: {
      signedTransactionInfo: signedTransactionInfo,
      signedRenewalInfo: jwt.sign({}, 'dummy_secret')
    }
  };

  const signedPayload = jwt.sign(mockPayloadData, 'dummy_secret');

  // 3. Call Service
  console.log('Testing SUBSCRIBED...');
  const result = await processNotification({ signedPayload });

  // 4. Verify
  console.log('Result:', result);

  if (
    result &&
    result.status === 'active' &&
    result.providerSubscriptionId === '1000000999'
  ) {
    console.log('✅ TEST PASSED: SUBSCRIBED notification processed correctly');
  } else {
    console.error('❌ TEST FAILED: SUBSCRIBED notification processing failed');
    process.exit(1);
  }

  // 5. Test EXPIRED
  console.log('\nTesting EXPIRED...');
  const expiredPayloadData = {
    notificationType: 'EXPIRED',
    data: {
        signedTransactionInfo: signedTransactionInfo, // Using same transaction info, but type is EXPIRED
        signedRenewalInfo: jwt.sign({}, 'dummy_secret')
    }
  };
  const signedExpiredPayload = jwt.sign(expiredPayloadData, 'dummy_secret');

  const expiredResult = await processNotification({ signedPayload: signedExpiredPayload });
  console.log('Expired Result:', expiredResult);

  if (expiredResult && expiredResult.status === 'expired') {
      console.log('✅ TEST PASSED: EXPIRED notification processed correctly');
  } else {
      console.error('❌ TEST FAILED: EXPIRED notification processing failed');
      process.exit(1);
  }
};

runTest().catch(error => {
    console.error('Test execution error:', error);
    process.exit(1);
});
