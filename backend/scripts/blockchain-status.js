// backend/scripts/blockchain-status.js
const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');

const chainName = process.env.MULTICHAIN_CHAINNAME || 'omph_hiv_chain';
const homeDir = os.homedir();
const chainDir = `${homeDir}/.multichain/${chainName}`;

// Required streams to check
const REQUIRED_STREAMS = [
  'audit_logs',
  'patient_records',
  'appointments',
  'lab_results'
];

async function executeCommand(command, ignoreErrors = false) {
  return new Promise((resolve) => {
    exec(command, { shell: true }, (error, stdout, stderr) => {
      if (error && !ignoreErrors) {
        resolve({ success: false, output: error.message });
      } else {
        resolve({ success: true, output: stdout || stderr });
      }
    });
  });
}

async function checkStreamSubscription(streamName) {
  // Try to get stream info which includes subscription status
  const { output } = await executeCommand(`multichain-cli ${chainName} getstreaminfo ${streamName}`, true);
  
  try {
    if (output && output.includes('"subscribed"')) {
      const info = JSON.parse(output);
      return info.subscribed === true;
    }
    
    // Alternative: check via liststreams with detailed info
    const { output: listOutput } = await executeCommand(`multichain-cli ${chainName} liststreams`, true);
    if (listOutput) {
      const streams = JSON.parse(listOutput);
      const stream = streams.find(s => s.name === streamName);
      return stream ? stream.subscribed === true : false;
    }
  } catch (e) {
    // If we can't parse, assume not subscribed
  }
  
  return false;
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
  const { success, output } = await executeCommand(`multichain-cli ${chainName} getinfo`, true);
  
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
      console.log(`   Wallet Balance: ${info.balance || info.walletbalance || 'N/A'}`);
      console.log(`   Streams: ${info.streams || 0}`);
      
      // Get mining info
      const { output: miningOutput } = await executeCommand(`multichain-cli ${chainName} getmininginfo`, true);
      if (miningOutput && !miningOutput.includes('error')) {
        try {
          const miningInfo = JSON.parse(miningOutput);
          console.log(`   Mining Enabled: ${miningInfo.mine ? 'Yes' : 'No'}`);
        } catch (e) {}
      }
      
      // Get disk usage
      const { output: duOutput } = await executeCommand(`du -sh ${chainDir} 2>/dev/null`, true);
      if (duOutput && duOutput.includes('/')) {
        console.log(`   Disk Usage: ${duOutput.split('\t')[0]}`);
      }
      
    } catch (e) {
      console.log('   Error parsing blockchain info');
      console.log(output);
    }
    
    // List streams with subscription status
    console.log('\n📋 Streams:');
    const { output: streamsOutput } = await executeCommand(`multichain-cli ${chainName} liststreams`, true);
    
    if (streamsOutput && !streamsOutput.includes('error')) {
      try {
        const allStreams = JSON.parse(streamsOutput);
        // Filter to only show our required streams plus root
        const relevantStreams = allStreams.filter(s => 
          s.name === 'root' || REQUIRED_STREAMS.includes(s.name)
        );
        
        if (relevantStreams.length === 0) {
          console.log('   No streams created yet');
        } else {
          for (const stream of relevantStreams) {
            // Get subscription status
            const subscribed = await checkStreamSubscription(stream.name);
            const statusIcon = subscribed ? '✅' : '⚠️';
            const subscriptionText = subscribed ? 'subscribed' : 'NOT subscribed';
            
            console.log(`   ${statusIcon} ${stream.name}: ${stream.items || 0} items [${subscriptionText}]`);
            
            // If not subscribed, show how to fix
            if (!subscribed && stream.name !== 'root') {
              console.log(`      💡 Fix: multichain-cli ${chainName} subscribe ${stream.name}`);
            }
          }
        }
      } catch (e) {
        console.log('   Unable to parse streams list');
        console.log(`   Error: ${e.message}`);
      }
    } else {
      console.log('   Unable to list streams (blockchain may be starting up)');
    }
    
    // Show recent blocks
    console.log('\n📦 Blockchain Status:');
    const { output: blocksOutput } = await executeCommand(`multichain-cli ${chainName} getblockchaininfo`, true);
    try {
      if (blocksOutput && !blocksOutput.includes('error')) {
        const blockchainInfo = JSON.parse(blocksOutput);
        console.log(`   Current Block: ${blockchainInfo.blocks}`);
        console.log(`   Verification Progress: ${(blockchainInfo.verificationprogress * 100).toFixed(2)}%`);
      } else {
        console.log(`   Blocks: ${JSON.parse(output).blocks}`);
      }
    } catch (e) {
      // Fallback to getinfo
      try {
        const info = JSON.parse(output);
        console.log(`   Current Block: ${info.blocks}`);
      } catch (err) {
        console.log('   Unable to get block info');
      }
    }
    
  } else {
    console.log('\n❌ STATUS: NOT RUNNING\n');
    
    // Check if there are any processes
    const { output: psOutput } = await executeCommand(`ps aux | grep "multichaind.*${chainName}" | grep -v grep`, true);
    if (psOutput && psOutput.trim()) {
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

module.exports = { showStatus, checkStreamSubscription };