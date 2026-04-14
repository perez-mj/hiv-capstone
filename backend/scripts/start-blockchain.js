// backend/scripts/start-blockchain.js
const { exec, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const chainName = process.env.MULTICHAIN_CHAINNAME || 'omph_hiv_chain';
const homeDir = os.homedir();
const chainDir = `${homeDir}/.multichain/${chainName}`;

// Configuration for development auto-mining
const AUTO_MINE = process.env.MULTICHAIN_AUTO_MINE !== 'false'; // Enable by default
const MINE_INTERVAL = parseInt(process.env.MULTICHAIN_MINE_INTERVAL || '2'); // Mine every 2 seconds

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function executeCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command}`);
    exec(command, { ...options, shell: true, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error && !options.ignoreErrors) {
        console.error(`Error: ${error.message}`);
        reject(error);
      } else {
        if (stdout && stdout.trim()) console.log(stdout.trim());
        if (stderr && !options.ignoreErrors && stderr.trim()) console.error(stderr.trim());
        resolve({ stdout, stderr });
      }
    });
  });
}

async function isBlockchainRunning() {
  try {
    const { stdout } = await executeCommand(`multichain-cli ${chainName} getinfo`, {
      ignoreErrors: true,
      timeout: 5000
    });
    
    if (stdout && stdout.includes('chainname')) {
      return JSON.parse(stdout);
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function stopBlockchain() {
  console.log('\n🛑 Stopping MultiChain daemon...');
  
  try {
    await executeCommand(`multichain-cli ${chainName} stop`, {
      ignoreErrors: true,
      timeout: 10000
    });
    
    // Wait for process to stop
    await sleep(3000);
    console.log('✅ Blockchain stopped');
    return true;
  } catch (error) {
    console.log('⚠️ Blockchain was not running or stop failed');
    return false;
  }
}

async function startBlockchain() {
  console.log('\n═══════════════════════════════════════════');
  console.log('    STARTING MULTICHAIN NODE');
  console.log('═══════════════════════════════════════════\n');
  
  // Check if chain exists
  if (!fs.existsSync(chainDir)) {
    console.error('❌ Blockchain does not exist. Please run setup first:');
    console.log('   npm run blockchain:setup');
    process.exit(1);
  }
  
  // Check if already running
  const runningInfo = await isBlockchainRunning();
  if (runningInfo) {
    console.log('✅ Blockchain is already running!');
    console.log(`\n📊 Status:`);
    console.log(`   Chain: ${runningInfo.chainname}`);
    console.log(`   Blocks: ${runningInfo.blocks}`);
    console.log(`   Connections: ${runningInfo.connections}`);
    console.log(`   Version: ${runningInfo.version}`);
    
    // Check if mining is enabled
    await checkAndEnableMining();
    return runningInfo;
  }
  
  // Stop any zombie processes
  await stopBlockchain();
  
  // Start the daemon with mining enabled
  console.log('🚀 Starting MultiChain daemon with auto-mining...');
  
  const startArgs = [chainName, '-daemon'];
  
  // Add mining parameters for development
  if (AUTO_MINE) {
    startArgs.push('-mine=1');
    startArgs.push(`-mineinterval=${MINE_INTERVAL}`);
    console.log(`⛏️ Auto-mining enabled: mining every ${MINE_INTERVAL} seconds`);
  }
  
  // Use spawn to run in background
  const daemon = spawn('multichaind', startArgs, {
    detached: true,
    stdio: 'ignore',
    shell: true
  });
  
  daemon.unref();
  
  // Wait for startup
  console.log('⏳ Waiting for node to be ready...');
  let attempts = 0;
  const maxAttempts = 20;
  
  while (attempts < maxAttempts) {
    await sleep(2000);
    attempts++;
    
    const info = await isBlockchainRunning();
    if (info) {
      console.log('\n✅ Blockchain started successfully!');
      console.log(`\n📊 Status:`);
      console.log(`   Chain: ${info.chainname}`);
      console.log(`   Blocks: ${info.blocks}`);
      console.log(`   Connections: ${info.connections}`);
      console.log(`   Mining: ${AUTO_MINE ? 'Enabled' : 'Disabled'}`);
      
      // Grant mining permission to the node address if needed
      await setupMiningPermissions();
      
      // Generate first block if chain is new
      if (info.blocks === 0) {
        console.log('\n⛏️ Generating initial blocks...');
        await generateBlocks(5);
      }
      
      return info;
    }
    
    process.stdout.write(`   Attempt ${attempts}/${maxAttempts}...\r`);
  }
  
  console.log('\n❌ Failed to start blockchain');
  console.log('Check logs: tail -f ~/.multichain/*/debug.log');
  
  // Try to get error from debug log
  try {
    const debugLogPath = `${chainDir}/debug.log`;
    if (fs.existsSync(debugLogPath)) {
      const lastLines = execSync(`tail -n 20 ${debugLogPath}`, { encoding: 'utf8' });
      console.log('\n📋 Last 20 lines of debug.log:');
      console.log(lastLines);
    }
  } catch (error) {
    // Ignore
  }
  
  return null;
}

async function checkAndEnableMining() {
  try {
    // Check current mining status
    const { stdout } = await executeCommand(`multichain-cli ${chainName} getmininginfo`, {
      ignoreErrors: true
    });
    
    if (stdout) {
      const miningInfo = JSON.parse(stdout);
      console.log(`\n⛏️ Mining Status:`);
      console.log(`   Enabled: ${miningInfo.mine ? 'Yes' : 'No'}`);
      console.log(`   Current Block: ${miningInfo.blocks}`);
      console.log(`   Network Hashrate: ${miningInfo.networkhashps || 0}`);
      
      if (!miningInfo.mine && AUTO_MINE) {
        console.log('\n⚠️ Mining is not enabled but AUTO_MINE is true');
        console.log('Please restart blockchain with mining enabled:');
        console.log(`  multichaind ${chainName} -daemon -mine=1 -mineinterval=${MINE_INTERVAL}`);
      }
    }
  } catch (error) {
    // getmininginfo might not be available in all versions
  }
}

async function setupMiningPermissions() {
  try {
    // Get node address
    const { stdout: addresses } = await executeCommand(`multichain-cli ${chainName} getaddresses`, {
      ignoreErrors: true
    });
    
    if (addresses) {
      const addressList = JSON.parse(addresses);
      if (addressList && addressList.length > 0) {
        const nodeAddress = addressList[0];
        
        // Grant mining permission
        await executeCommand(`multichain-cli ${chainName} grant ${nodeAddress} mine`, {
          ignoreErrors: true
        });
        
        console.log(`✅ Mining permission granted to ${nodeAddress.substring(0, 10)}...`);
      }
    }
  } catch (error) {
    // Permissions might already be set or not needed
  }
}

async function generateBlocks(count = 1) {
  console.log(`⛏️ Generating ${count} block(s)...`);
  
  try {
    // Try different methods
    const methods = [
      async () => {
        const { stdout } = await executeCommand(`multichain-cli ${chainName} generate ${count}`, {
          ignoreErrors: true,
          timeout: 30000
        });
        return stdout;
      },
      async () => {
        const { stdout: address } = await executeCommand(`multichain-cli ${chainName} getnewaddress`, {
          ignoreErrors: true
        });
        if (address) {
          const { stdout } = await executeCommand(`multichain-cli ${chainName} generatetoaddress ${count} ${address.trim()}`, {
            ignoreErrors: true,
            timeout: 30000
          });
          return stdout;
        }
        throw new Error('No address available');
      }
    ];
    
    for (const method of methods) {
      try {
        const result = await method();
        if (result) {
          console.log(`✅ Generated ${count} block(s) successfully`);
          return true;
        }
      } catch (error) {
        // Try next method
        continue;
      }
    }
    
    throw new Error('All mining methods failed');
  } catch (error) {
    console.log(`⚠️ Could not generate blocks: ${error.message}`);
    console.log(`   You may need to mine manually: multichain-cli ${chainName} generate ${count}`);
    return false;
  }
}

async function restartWithMining() {
  console.log('\n🔄 Restarting blockchain with mining enabled...');
  
  await stopBlockchain();
  await sleep(3000);
  
  // Clear any lock files
  const lockFile = `${chainDir}/.lock`;
  if (fs.existsSync(lockFile)) {
    fs.unlinkSync(lockFile);
    console.log('Removed lock file');
  }
  
  return await startBlockchain();
}

async function getBlockchainStatus() {
  const info = await isBlockchainRunning();
  
  if (!info) {
    console.log('❌ Blockchain is not running');
    return null;
  }
  
  console.log('\n📊 Blockchain Status:');
  console.log('═'.repeat(50));
  console.log(`Chain Name: ${info.chainname || 'N/A'}`);
  console.log(`Blocks: ${info.blocks || 0}`);
  console.log(`Connections: ${info.connections || 0}`);
  console.log(`Version: ${info.version || 'N/A'}`);
  console.log(`Protocol Version: ${info.protocolversion || 'N/A'}`);
  console.log(`Wallet Balance: ${info.walletbalance || 0}`);
  
  // Get mining info if available
  try {
    const { stdout } = await executeCommand(`multichain-cli ${chainName} getmininginfo`, {
      ignoreErrors: true
    });
    if (stdout) {
      const miningInfo = JSON.parse(stdout);
      console.log(`\n⛏️ Mining:`);
      console.log(`   Enabled: ${miningInfo.mine ? 'Yes' : 'No'}`);
      console.log(`   Mining Interval: ${MINE_INTERVAL}s`);
    }
  } catch (error) {
    // Ignore - older version
  }
  
  // Check streams
  try {
    const { stdout } = await executeCommand(`multichain-cli ${chainName} liststreams`, {
      ignoreErrors: true
    });
    if (stdout) {
      const streams = JSON.parse(stdout);
      console.log(`\n📋 Streams (${streams.length}):`);
      streams.forEach(stream => {
        console.log(`   - ${stream.name}`);
      });
    }
  } catch (error) {
    // Ignore
  }
  
  return info;
}

// CLI arguments handling
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'stop':
      stopBlockchain().then(() => process.exit(0));
      break;
    case 'restart':
      restartWithMining().then(() => process.exit(0));
      break;
    case 'status':
      getBlockchainStatus().then(() => process.exit(0));
      break;
    case 'mine':
      const count = parseInt(process.argv[3]) || 1;
      generateBlocks(count).then(() => process.exit(0));
      break;
    default:
      startBlockchain().then(() => process.exit(0));
  }
}

module.exports = { 
  startBlockchain, 
  stopBlockchain, 
  restartWithMining, 
  getBlockchainStatus,
  generateBlocks,
  isBlockchainRunning
};