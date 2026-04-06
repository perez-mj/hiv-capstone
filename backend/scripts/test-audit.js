require('dotenv').config();

const blockchainAuditService = require('../services/blockchainAuditService');

async function testAudit() {
  console.log('\n🔍 Testing Blockchain Audit Integration\n');
  
  // Initialize service
  await blockchainAuditService.initialize();
  
  if (blockchainAuditService.enabled) {
    console.log('\n✅ Blockchain is enabled!');
    
    // Test logging an action
    console.log('\n📝 Testing audit log...');
    const result = await blockchainAuditService.logAction(
      'TEST',
      'test_table',
      '123',
      null,
      null,
      { test: 'data' },
      'Test audit log entry',
      { user: { username: 'test_user' }, ip: '127.0.0.1' }
    );
    
    console.log('Audit result:', result);
    
    // Retrieve audit trail
    console.log('\n📋 Retrieving audit trail...');
    const trail = await blockchainAuditService.getAuditTrail('test_table', '123', null, 10, 0);
    console.log(`Found ${trail.length} entries`);
    
    if (trail.length > 0) {
      console.log('Latest entry:', trail[0]);
    }
    
    // Get statistics
    console.log('\n📊 Getting statistics...');
    const stats = await blockchainAuditService.getAuditStatistics();
    console.log('Statistics:', JSON.stringify(stats, null, 2));
    
  } else {
    console.log('\n❌ Blockchain is not enabled');
  }
}

testAudit().catch(console.error);