// Load environment variables first
require('dotenv').config();

const MultiChainHTTPClient = require('../config/multichain-http');

async function testConnection() {
  console.log('\n🔍 Testing MultiChain HTTP Connection\n');
  
  // Debug: Check if environment variables are loaded
  console.log('Environment check:');
  console.log(`  MULTICHAIN_PORT: ${process.env.MULTICHAIN_PORT}`);
  console.log(`  MULTICHAIN_USER: ${process.env.MULTICHAIN_USER}`);
  console.log(`  MULTICHAIN_PASSWORD: ${process.env.MULTICHAIN_PASSWORD ? '✓ Set' : '✗ Not set'}`);
  console.log(`  MULTICHAIN_CHAINNAME: ${process.env.MULTICHAIN_CHAINNAME}`);
  
  const client = new MultiChainHTTPClient();
  
  try {
    await client.initialize();
    
    console.log('\n📋 Listing streams:');
    const streams = await client.listStreams();
    streams.forEach(stream => {
      console.log(`  - ${stream.name} (${stream.items || 0} items)`);
    });
    
    console.log('\n✅ Connection test successful!');
    
  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testConnection();