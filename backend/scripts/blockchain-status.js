const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');

const chainName = process.env.MULTICHAIN_CHAINNAME || 'omph_hiv_chain';
const homeDir = os.homedir();
const chainDir = `${homeDir}/.multichain/${chainName}`;

async function executeCommand(command) {
  return new Promise((resolve) => {
    exec(command, { shell: true }, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, output: error.message });
      } else {
        resolve({ success: true, output: stdout || stderr });
      }
    });
  });
}

async function showStatus() {
  console.log('\n═══════════════════════════════════════════');
  console.log('    MULTICHAIN STATUS');
  console.log('═══════════════════════════════════════════\n');
  
  // Check if chain exists
  if (!fs.existsSync(chainDir)) {
    console.log('❌ Blockchain does not exist');
    console.log('\nTo create a new blockchain:');
    console.log('  npm run blockchain:setup');
    return;
  }
  
  console.log(`📁 Chain Directory: ${chainDir}`);
  
  // Check if running
  const { success, output } = await executeCommand(`multichain-cli ${chainName} getinfo`);
  
  if (success && output.includes('chainname')) {
    console.log('\n✅ STATUS: RUNNING\n');
    
    try {
      const info = JSON.parse(output);
      console.log('📊 Blockchain Info:');
      console.log(`   Chain: ${info.chainname}`);
      console.log(`   Version: ${info.protocolversion}`);
      console.log(`   Blocks: ${info.blocks}`);
      console.log(`   Connections: ${info.connections}`);
      console.log(`   Difficulty: ${info.difficulty}`);
      console.log(`   Wallet Balance: ${info.walletbalance || 'N/A'}`);
      
      // Get disk usage
      const { output: duOutput } = await executeCommand(`du -sh ${chainDir}`);
      if (duOutput) {
        console.log(`   Disk Usage: ${duOutput.split('\t')[0]}`);
      }
      
    } catch (e) {
      console.log(output);
    }
    
    // List streams
    console.log('\n📋 Streams:');
    const { output: streamsOutput } = await executeCommand(`multichain-cli ${chainName} liststreams`);
    try {
      const streams = JSON.parse(streamsOutput);
      if (streams.length === 0) {
        console.log('   No streams created yet');
      } else {
        streams.forEach(stream => {
          console.log(`   - ${stream.name} (${stream.items || 0} items, ${stream.subscriptions || 0} subscribers)`);
        });
      }
    } catch (e) {
      console.log('   Unable to list streams');
    }
    
    // Show recent blocks
    console.log('\n📦 Recent Blocks:');
    const { output: blocksOutput } = await executeCommand(`multichain-cli ${chainName} getblockchaininfo`);
    try {
      const blockchainInfo = JSON.parse(blocksOutput);
      console.log(`   Current Block: ${blockchainInfo.blocks}`);
      console.log(`   Verification Progress: ${(blockchainInfo.verificationprogress * 100).toFixed(2)}%`);
    } catch (e) {
      console.log('   Unable to get block info');
    }
    
  } else {
    console.log('\n❌ STATUS: NOT RUNNING\n');
    
    // Check if there are any processes
    const { output: psOutput } = await executeCommand(`ps aux | grep "multichaind.*${chainName}" | grep -v grep`);
    if (psOutput) {
      console.log('⚠️  Found zombie processes:');
      console.log(psOutput);
      console.log('\nRun to clean up: npm run blockchain:stop');
    } else {
      console.log('To start the blockchain:');
      console.log('  npm run blockchain:start');
    }
  }
  
  console.log('\n═══════════════════════════════════════════');
}

// Run if called directly
if (require.main === module) {
  showStatus();
}

module.exports = { showStatus };