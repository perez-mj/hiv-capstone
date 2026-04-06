const { stopBlockchain } = require('./stop-blockchain');
const { startBlockchain } = require('./start-blockchain');

async function restartBlockchain() {
  console.log('\n═══════════════════════════════════════════');
  console.log('    RESTARTING MULTICHAIN NODE');
  console.log('═══════════════════════════════════════════\n');
  
  await stopBlockchain();
  
  console.log('\n⏳ Waiting 3 seconds before starting...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  await startBlockchain();
  
  console.log('\n✅ Restart complete!');
}

// Run if called directly
if (require.main === module) {
  restartBlockchain();
}

module.exports = { restartBlockchain };