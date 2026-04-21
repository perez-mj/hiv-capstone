// backend/scripts/start-blockchain.js
const { exec, spawn } = require('child_process');
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

// Configuration for development auto-mining
const AUTO_MINE = process.env.MULTICHAIN_AUTO_MINE !== 'false'; // Enable by default
const MINE_INTERVAL = parseInt(process.env.MULTICHAIN_MINE_INTERVAL || '2'); // Mine every 2 seconds

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function executeCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command}`);
    const execOptions = { 
      ...options, 
      shell: process.platform === 'win32' ? 'powershell.exe' : true,
      maxBuffer: 1024 * 1024 * 10,
      timeout: options.timeout || 30000
    };
    
    exec(command, execOptions, (error, stdout, stderr) => {
      if (error && !options.ignoreErrors) {
        console.error(`Error: ${error.message}`);
        reject(error);
      } else {
        if (stdout && stdout.toString().trim()) console.log(stdout.toString().trim());
        if (stderr && !options.ignoreErrors && stderr.toString().trim()) console.error(stderr.toString().trim());
        resolve({ stdout: stdout?.toString() || '', stderr: stderr?.toString() || '' });
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

async function stopBlockchainWindows() {
  console.log('\n🛑 Stopping MultiChain daemon...');
  
  try {
    // Try graceful stop first
    await executeCommand(`multichain-cli ${chainName} stop`, {
      ignoreErrors: true,
      timeout: 10000
    });
    
    await sleep(3000);
    
    // Force kill any remaining processes
    const { stdout } = await executeCommand(
      `powershell -Command "Get-Process -Name multichaind -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id"`,
      { ignoreErrors: true }
    );
    
    if (stdout && stdout.trim()) {
      const processIds = stdout.trim().split('\n');
      for (const pid of processIds) {
        if (pid) {
          await executeCommand(`taskkill /F /PID ${pid}`, { ignoreErrors: true });
          console.log(`✅ Killed process ${pid}`);
        }
      }
    }
    
    console.log('✅ Blockchain stopped');
    return true;
  } catch (error) {
    console.log('⚠️ Blockchain was not running or stop failed');
    return false;
  }
}

async function stopBlockchainLinux() {
  console.log('\n🛑 Stopping MultiChain daemon...');
  
  try {
    await executeCommand(`multichain-cli ${chainName} stop`, {
      ignoreErrors: true,
      timeout: 10000
    });
    
    await sleep(3000);
    
    // Kill any remaining processes
    await executeCommand(`pkill -f "multichaind.*${chainName}"`, {
      ignoreErrors: true
    });
    
    console.log('✅ Blockchain stopped');
    return true;
  } catch (error) {
    console.log('⚠️ Blockchain was not running or stop failed');
    return false;
  }
}

async function stopBlockchain() {
  if (process.platform === 'win32') {
    return await stopBlockchainWindows();
  } else {
    return await stopBlockchainLinux();
  }
}

async function startBlockchainWindows() {
  return new Promise(async (resolve, reject) => {
    // Check if chain exists
    if (!fs.existsSync(chainDir)) {
      reject(new Error('Blockchain does not exist. Please run setup first: npm run blockchain:setup'));
      return;
    }
    
    // Start the node (on Windows, don't use -daemon flag)
    console.log('🚀 Starting MultiChain node...');
    
    const startCommand = `start /B multichaind ${chainName}`;
    
    exec(startCommand, { shell: true }, async (error) => {
      if (error) {
        reject(error);
        return;
      }
      
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
          console.log(`   Mining: ${AUTO_MINE ? 'Enabled (manual mining required)' : 'Disabled'}`);
          
          resolve(info);
          return;
        }
        
        process.stdout.write(`   Attempt ${attempts}/${maxAttempts}...\r`);
      }
      
      reject(new Error('Failed to start blockchain'));
    });
  });
}

async function startBlockchainLinux() {
  // Check if chain exists
  if (!fs.existsSync(chainDir)) {
    throw new Error('Blockchain does not exist. Please run setup first: npm run blockchain:setup');
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
    
    await checkAndEnableMining();
    return runningInfo;
  }
  
  // Stop any zombie processes
  await stopBlockchain();
  
  // Start the daemon with mining enabled
  console.log('🚀 Starting MultiChain daemon...');
  
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
  
  throw new Error('Failed to start blockchain');
}

async function startBlockchain() {
  console.log('\n═══════════════════════════════════════════');
  console.log('    STARTING MULTICHAIN NODE');
  console.log('═══════════════════════════════════════════\n');
  
  console.log(`Chain Name: ${chainName}`);
  console.log(`Chain Directory: ${chainDir}`);
  console.log(`Platform: ${process.platform}`);
  console.log(`Auto-mine: ${AUTO_MINE ? 'Yes' : 'No'}`);
  
  try {
    let result;
    if (process.platform === 'win32') {
      result = await startBlockchainWindows();
    } else {
      result = await startBlockchainLinux();
    }
    
    // Check if mining is enabled
    await checkAndEnableMining();
    
    return result;
  } catch (error) {
    console.error('\n❌ Failed to start blockchain:', error.message);
    console.log('\nTroubleshooting:');
    if (process.platform === 'win32') {
      console.log('1. Check if MultiChain is installed: multichaind --version');
      console.log('2. Check logs: type "%APPDATA%\\MultiChain\\*\\debug.log"');
      console.log('3. Try manual start: multichaind ' + chainName);
      console.log('4. Check if chain exists: dir "%APPDATA%\\MultiChain"');
    } else {
      console.log('1. Check if MultiChain is installed: multichaind --version');
      console.log('2. Check logs: tail -f ~/.multichain/*/debug.log');
      console.log('3. Try manual start: multichaind ' + chainName + ' -daemon');
      console.log('4. Check if chain exists: ls ~/.multichain/');
    }
    process.exit(1);
  }
}

async function checkAndEnableMining() {
  try {
    // Check current mining status
    const { stdout } = await executeCommand(`multichain-cli ${chainName} getmininginfo`, {
      ignoreErrors: true
    });
    
    if (stdout && stdout.trim()) {
      const miningInfo = JSON.parse(stdout);
      console.log(`\n⛏️ Mining Status:`);
      console.log(`   Enabled: ${miningInfo.mine ? 'Yes' : 'No'}`);
      console.log(`   Current Block: ${miningInfo.blocks}`);
      console.log(`   Network Hashrate: ${miningInfo.networkhashps || 0}`);
      
      if (!miningInfo.mine && AUTO_MINE && process.platform !== 'win32') {
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
    
    if (addresses && addresses.trim()) {
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
        if (address && address.trim()) {
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
        if (result && result.stdout) {
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
  console.log('\n🔄 Restarting blockchain...');
  
  await stopBlockchain();
  await sleep(3000);
  
  // Clear any lock files
  const lockFile = process.platform === 'win32' 
    ? path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'MultiChain', `${chainName}.lock`)
    : `${chainDir}/.lock`;
    
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
    if (stdout && stdout.trim()) {
      const miningInfo = JSON.parse(stdout);
      console.log(`\n⛏️ Mining:`);
      console.log(`   Enabled: ${miningInfo.mine ? 'Yes' : 'No'}`);
      if (miningInfo.mine) {
        console.log(`   Mining Interval: ${MINE_INTERVAL}s`);
      }
    }
  } catch (error) {
    // Ignore - older version
  }
  
  // Check streams
  try {
    const { stdout } = await executeCommand(`multichain-cli ${chainName} liststreams`, {
      ignoreErrors: true
    });
    if (stdout && stdout.trim()) {
      const streams = JSON.parse(stdout);
      console.log(`\n📋 Streams (${streams.length}):`);
      streams.slice(0, 10).forEach(stream => {
        console.log(`   - ${stream.name} (${stream.items || 0} items)`);
      });
      if (streams.length > 10) {
        console.log(`   ... and ${streams.length - 10} more`);
      }
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
  isBlockchainRunning,
  getChainDir
};