// backend/scripts/blockchain-status.js
const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const chainName = process.env.MULTICHAIN_CHAINNAME || 'omph_hiv_chain';

// Cross-platform chain directory detection
const getChainDir = () => {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, 'MultiChain', chainName);
  } else {
    return path.join(os.homedir(), '.multichain', chainName);
  }
};

const chainDir = getChainDir();

// Required streams to check
const REQUIRED_STREAMS = [
  'audit_logs',
  'patient_records',
  'appointments',
  'lab_results'
];

async function executeCommand(command, ignoreErrors = false) {
  return new Promise((resolve) => {
    // Use appropriate shell for each platform
    const options = { 
      shell: process.platform === 'win32' ? 'powershell.exe' : true,
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    };
    
    exec(command, options, (error, stdout, stderr) => {
      if (error && !ignoreErrors) {
        resolve({ success: false, output: error.message });
      } else {
        // Prefer stdout, fallback to stderr
        const output = stdout || stderr || '';
        resolve({ success: true, output: output.toString() });
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
    if (listOutput && listOutput.trim()) {
      const streams = JSON.parse(listOutput);
      const stream = streams.find(s => s.name === streamName);
      return stream ? stream.subscribed === true : false;
    }
  } catch (e) {
    // If we can't parse, assume not subscribed
  }
  
  return false;
}

async function getDirectorySize(dirPath) {
  try {
    if (process.platform === 'win32') {
      // Windows: Use PowerShell to get directory size
      const { output } = await executeCommand(
        `powershell -Command "& { if (Test-Path '${dirPath}') { (Get-ChildItem -Recurse '${dirPath}' -File | Measure-Object -Property Length -Sum).Sum } else { 0 } }"`,
        true
      );
      const sizeBytes = parseInt(output.trim());
      if (!isNaN(sizeBytes) && sizeBytes > 0) {
        return formatBytes(sizeBytes);
      }
      return 'N/A';
    } else {
      // Linux/Unix: Use du command
      const { output } = await executeCommand(`du -sh "${dirPath}" 2>/dev/null | cut -f1`, true);
      if (output && output.trim() && !output.includes('No such file')) {
        return output.trim();
      }
      return 'N/A';
    }
  } catch (error) {
    return 'N/A';
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function checkIfRunning() {
  const { success, output } = await executeCommand(`multichain-cli ${chainName} getinfo`, true);
  return success && output && output.includes('chainname');
}

async function showStatus() {
  console.log('\n═══════════════════════════════════════════');
  console.log('    MULTICHAIN STATUS');
  console.log('═══════════════════════════════════════════\n');
  
  // Check if chain exists
  if (!fs.existsSync(chainDir)) {
    console.log('❌ Blockchain does not exist');
    console.log(`   Expected location: ${chainDir}`);
    console.log('\nTo create a new blockchain:');
    console.log('  npm run blockchain:setup');
    console.log('\n═══════════════════════════════════════════');
    return;
  }
  
  console.log(`📁 Chain Directory: ${chainDir}`);
  
  // Check if running
  const isRunning = await checkIfRunning();
  
  if (isRunning) {
    console.log('\n✅ STATUS: RUNNING\n');
    
    // Get blockchain info
    const { output } = await executeCommand(`multichain-cli ${chainName} getinfo`, true);
    
    if (output && output.includes('chainname')) {
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
        
        // Get mining info (cross-platform)
        const { output: miningOutput } = await executeCommand(`multichain-cli ${chainName} getmininginfo`, true);
        if (miningOutput && !miningOutput.includes('error') && miningOutput.trim()) {
          try {
            const miningInfo = JSON.parse(miningOutput);
            console.log(`   Mining Enabled: ${miningInfo.mine ? 'Yes' : 'No'}`);
          } catch (e) {
            // Silent fail
          }
        }
        
        // Get disk usage (cross-platform)
        const diskUsage = await getDirectorySize(chainDir);
        if (diskUsage !== 'N/A') {
          console.log(`   Disk Usage: ${diskUsage}`);
        }
        
      } catch (e) {
        console.log('   📊 Blockchain Info:');
        console.log(`   ${output.substring(0, 200)}`);
      }
    }
    
    // List streams with subscription status
    console.log('\n📋 Streams:');
    const { output: streamsOutput } = await executeCommand(`multichain-cli ${chainName} liststreams`, true);
    
    if (streamsOutput && !streamsOutput.includes('error') && streamsOutput.trim()) {
      try {
        const allStreams = JSON.parse(streamsOutput);
        // Filter to only show our required streams plus root
        const relevantStreams = allStreams.filter(s => 
          s.name === 'root' || REQUIRED_STREAMS.includes(s.name)
        );
        
        if (relevantStreams.length === 0) {
          console.log('   No streams created yet');
          console.log('\n   To create required streams:');
          console.log(`   npm run blockchain:setup`);
        } else {
          for (const stream of relevantStreams) {
            // Get subscription status
            const subscribed = await checkStreamSubscription(stream.name);
            const statusIcon = subscribed ? '✅' : '⚠️';
            const subscriptionText = subscribed ? 'subscribed' : 'NOT subscribed';
            
            console.log(`   ${statusIcon} ${stream.name}: ${stream.items || 0} items [${subscriptionText}]`);
            
            // If not subscribed, show how to fix
            if (!subscribed && stream.name !== 'root') {
              const command = `multichain-cli ${chainName} subscribe ${stream.name}`;
              console.log(`      💡 Fix: ${command}`);
            }
          }
        }
      } catch (e) {
        console.log('   Unable to parse streams list');
        console.log(`   Error: ${e.message}`);
        console.log(`   Raw output: ${streamsOutput.substring(0, 200)}`);
      }
    } else {
      console.log('   No streams found or unable to list streams');
      if (streamsOutput && streamsOutput.includes('error')) {
        console.log(`   Response: ${streamsOutput.substring(0, 100)}`);
      }
    }
    
    // Show blockchain status
    console.log('\n📦 Blockchain Status:');
    const { output: blocksOutput } = await executeCommand(`multichain-cli ${chainName} getblockchaininfo`, true);
    try {
      if (blocksOutput && !blocksOutput.includes('error') && blocksOutput.trim()) {
        const blockchainInfo = JSON.parse(blocksOutput);
        console.log(`   Current Block: ${blockchainInfo.blocks}`);
        console.log(`   Verification Progress: ${(blockchainInfo.verificationprogress * 100).toFixed(2)}%`);
      } else {
        // Fallback to getinfo
        const { output: infoOutput } = await executeCommand(`multichain-cli ${chainName} getinfo`, true);
        if (infoOutput && infoOutput.includes('blocks')) {
          const info = JSON.parse(infoOutput);
          console.log(`   Current Block: ${info.blocks}`);
        }
      }
    } catch (e) {
      console.log('   Unable to get block info');
    }
    
  } else {
    console.log('\n❌ STATUS: NOT RUNNING\n');
    
    // Check if chain exists but not running
    if (fs.existsSync(chainDir)) {
      console.log('⚠️  Blockchain data exists but node is not running');
      console.log('\nTo start the blockchain:');
      console.log('  npm run blockchain:start');
      
      // Show how to start manually
      console.log('\nOr manually:');
      if (process.platform === 'win32') {
        console.log(`  multichaind ${chainName} -daemon`);
        console.log('  Note: On Windows, open a new terminal instead of using -daemon');
      } else {
        console.log(`  multichaind ${chainName} -daemon`);
      }
    } else {
      console.log('❌ Blockchain not set up');
      console.log('\nTo create and start the blockchain:');
      console.log('  npm run blockchain:setup');
    }
  }
  
  console.log('\n═══════════════════════════════════════════');
}

// Helper function to get stream details (useful for debugging)
async function getStreamDetails(streamName) {
  const { output } = await executeCommand(`multichain-cli ${chainName} getstreaminfo ${streamName}`, true);
  try {
    if (output && output.trim()) {
      return JSON.parse(output);
    }
  } catch (e) {
    return null;
  }
  return null;
}

// Run if called directly
if (require.main === module) {
  showStatus().catch(console.error);
}

module.exports = { showStatus, checkStreamSubscription, getStreamDetails, getChainDir };