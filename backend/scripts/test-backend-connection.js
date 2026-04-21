const path = require('path');
// Load .env from the correct location
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('Environment check:');
console.log(`MULTICHAIN_HOST: ${process.env.MULTICHAIN_HOST}`);
console.log(`MULTICHAIN_PORT: ${process.env.MULTICHAIN_PORT}`);
console.log(`MULTICHAIN_USER: ${process.env.MULTICHAIN_USER}`);
console.log(`MULTICHAIN_PASSWORD: ${process.env.MULTICHAIN_PASSWORD ? '✓ Set' : '✗ Not set'}`);
console.log(`MULTICHAIN_CHAINNAME: ${process.env.MULTICHAIN_CHAINNAME}\n`);

const multichainService = require('./backend/services/multichainService');

async function test() {
  console.log('Testing MultiChain backend connection...\n');
  
  try {
    // Initialize
    await multichainService.initializeClient();
    
    // Get info
    const info = await multichainService.getInfo();
    console.log('✅ Blockchain Info:');
    console.log(`   Chain: ${info.chain_name}`);
    console.log(`   Blocks: ${info.total_blocks}`);
    console.log(`   Connections: ${info.connections}`);
    console.log(`   Difficulty: ${info.difficulty}`);
    console.log(`   Mining: ${info.mining ? 'Active' : 'Inactive'}`);
    
    // Get streams
    const streams = await multichainService.getStreams();
    console.log(`\n✅ Streams (${streams.length}):`);
    streams.forEach(s => {
      console.log(`   - ${s.name}: ${s.items} items [${s.subscribed ? '✓ subscribed' : '✗ not subscribed'}]`);
    });
    
    // Get recent blocks
    const blocks = await multichainService.getBlocks(5);
    console.log(`\n✅ Recent Blocks (${blocks.length}):`);
    blocks.forEach(b => {
      console.log(`   #${b.height}: ${b.hash?.substring(0, 16)}... (${b.transaction_count} txs) - ${new Date(b.timestamp).toLocaleString()}`);
    });
    
    // Get integrity verification
    const verification = await multichainService.verifyIntegrity();
    console.log(`\n✅ Integrity Check: ${verification.valid ? 'PASSED' : 'FAILED'}`);
    console.log(`   ${verification.message}`);
    
    console.log('\n🎉 Backend successfully connected to MultiChain!');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   1. MultiChain is running: npm run blockchain:status');
    console.log('   2. The .env file is in the root directory');
    console.log('   3. MultiChain RPC port is correct (check multichain.conf for rpcport)');
    console.log('   4. Run: multichain-cli omph_hiv_chain getinfo to verify node is responsive');
  }
}

test();