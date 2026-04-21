const { stopBlockchain } = require('./stop-blockchain');
const { startBlockchain } = require('./start-blockchain');
const os = require('os');

async function restartBlockchain() {
  console.log('\n═══════════════════════════════════════════');
  console.log('    RESTARTING MULTICHAIN NODE');
  console.log('═══════════════════════════════════════════\n');
  
  console.log(`Platform: ${process.platform}`);
  
  await stopBlockchain();
  
  console.log('\n⏳ Waiting 3 seconds before starting...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  await startBlockchain();
  
  console.log('\n✅ Restart complete!');
  console.log('\nTo check status, run:');
  console.log('  npm run blockchain:status');
}

// Run if called directly
if (require.main === module) {
  restartBlockchain().catch(error => {
    console.error('❌ Restart failed:', error.message);
    process.exit(1);
  });
}

module.exports = { restartBlockchain };