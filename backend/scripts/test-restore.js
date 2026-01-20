
import { pool, query } from '../src/config/database.js';
import billingService from '../src/services/billingService.js';

const TEST_EMAIL = `test_restore_${Date.now()}@example.com`;
const TEST_RECEIPT = 'valid_apple_receipt_mock_data';

async function runTest() {
  console.log('🚀 Starting Restore Purchase Test...');

  let userId;

  try {
    // 1. Create a test user
    console.log('creating test user...');
    const userResult = await query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, 'hash', 'Test User')
       RETURNING id`,
      [TEST_EMAIL]
    );
    userId = userResult.rows[0].id;
    console.log(`✅ Created test user ID: ${userId}`);

    // 2. Test Restore (Scenario: New Subscription)
    console.log('\n--- Test 1: Restore New Subscription ---');
    const result1 = await billingService.restoreSubscription(userId, 'apple', TEST_RECEIPT);
    console.log('Result:', JSON.stringify(result1, null, 2));

    if (result1.action === 'created' && result1.subscription.status === 'active') {
      console.log('✅ Test 1 Passed: Subscription created');
    } else {
      console.error('❌ Test 1 Failed');
    }

    // 3. Test Restore (Scenario: Existing Subscription for same user)
    console.log('\n--- Test 2: Restore Existing Subscription (Same User) ---');
    const result2 = await billingService.restoreSubscription(userId, 'apple', TEST_RECEIPT);
    console.log('Result:', JSON.stringify(result2, null, 2));

    if (result2.action === 'restored') {
      console.log('✅ Test 2 Passed: Subscription synced/restored');
    } else {
      console.error('❌ Test 2 Failed');
    }

    // 4. Test Restore (Scenario: Conflict - Another User)
    console.log('\n--- Test 3: Restore Conflict (Another User) ---');

    // Create another user
    const user2Result = await query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, 'hash', 'Test User 2')
       RETURNING id`,
      [`conflict_${Date.now()}@example.com`]
    );
    const user2Id = user2Result.rows[0].id;

    try {
      await billingService.restoreSubscription(user2Id, 'apple', TEST_RECEIPT);
      console.error('❌ Test 3 Failed: Should have thrown error');
    } catch (error) {
      if (error.message.includes('associated with another account')) {
        console.log('✅ Test 3 Passed: Error thrown as expected');
      } else {
        console.error('❌ Test 3 Failed: Wrong error message:', error.message);
      }
    }

    // Clean up
    await query(`DELETE FROM users WHERE id IN ($1, $2)`, [userId, user2Id]);
    console.log('\n✅ Cleanup complete');

  } catch (error) {
    console.error('❌ Test Failed:', error);
  } finally {
    await pool.end();
  }
}

runTest();
