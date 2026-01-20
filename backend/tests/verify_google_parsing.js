// Script to verify Google Pub/Sub message parsing logic
// This logic mirrors backend/src/controllers/billing.controller.js

const verifyParsing = () => {
  console.log('🧪 Starting Google Pub/Sub Parsing Verification...');

  // Mock Data
  const notificationPayload = {
    version: '1.0',
    packageName: 'com.fitcoach.app',
    eventTimeMillis: '1503349566275',
    subscriptionNotification: {
      version: '1.0',
      notificationType: 4, // SUBSCRIPTION_PURCHASED
      purchaseToken: 'test-purchase-token-123',
      subscriptionId: 'monthly_pro'
    }
  };

  const jsonString = JSON.stringify(notificationPayload);
  const base64Data = Buffer.from(jsonString).toString('base64');

  const req = {
    body: {
      message: {
        attributes: { key: 'value' },
        data: base64Data,
        messageId: '1234567890'
      },
      subscription: 'projects/test/subscriptions/test-sub'
    }
  };

  console.log('📦 Mock Request Body:', JSON.stringify(req.body, null, 2));

  // --- Logic from Controller ---
  try {
    const message = req.body.message;
    if (!message || !message.data) {
      throw new Error('Invalid payload');
    }

    const decodedData = Buffer.from(message.data, 'base64').toString('utf-8');
    console.log('🔓 Decoded Data:', decodedData);

    const notification = JSON.parse(decodedData);

    // Assertions
    if (notification.packageName !== 'com.fitcoach.app') throw new Error('Package Name mismatch');
    if (!notification.subscriptionNotification) throw new Error('Missing subscriptionNotification');

    const { subscriptionId, purchaseToken, notificationType } = notification.subscriptionNotification;

    if (subscriptionId !== 'monthly_pro') throw new Error('Subscription ID mismatch');
    if (purchaseToken !== 'test-purchase-token-123') throw new Error('Purchase Token mismatch');
    if (notificationType !== 4) throw new Error('Notification Type mismatch');

    console.log('✅ Parsing Successful! All fields extracted correctly.');
    console.log(`   - ID: ${subscriptionId}`);
    console.log(`   - Token: ${purchaseToken}`);
    console.log(`   - Type: ${notificationType}`);

  } catch (error) {
    console.error('❌ Verification Failed:', error);
    process.exit(1);
  }
};

verifyParsing();
