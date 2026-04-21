// backend/scripts/setup-blockchain.js
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

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

// Required streams for the application
const REQUIRED_STREAMS = [
  'audit_logs',
  'patient_records',
  'appointments',
  'lab_results'
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function executeCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command}`);
    const execOptions = { 
      ...options, 
      shell: process.platform === 'win32' ? 'powershell.exe' : true,
      timeout: options.timeout || 30000,
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    };
    
    exec(command, execOptions, (error, stdout, stderr) => {
      if (error && !options.ignoreErrors) {
        console.error(`Error: ${error.message}`);
        reject(error);
      } else {
        if (stdout && stdout.toString().trim()) console.log(stdout.toString());
        if (stderr && !options.ignoreErrors && stderr.toString().trim()) console.error(stderr.toString());
        resolve({ stdout: stdout?.toString() || '', stderr: stderr?.toString() || '' });
      }
    });
  });
}

async function startDaemon() {
  console.log('Starting MultiChain daemon...');
  
  if (process.platform === 'win32') {
    // Windows: Use start /B to run in background
    return new Promise((resolve, reject) => {
      const startCommand = `start /B multichaind ${chainName}`;
      exec(startCommand, { shell: true }, (error) => {
        if (error) {
          reject(error);
        } else {
          setTimeout(resolve, 5000);
        }
      });
    });
  } else {
    // Linux: Use spawn with detached mode
    return new Promise((resolve, reject) => {
      const daemon = spawn('multichaind', [chainName, '-daemon'], {
        detached: true,
        stdio: 'ignore',
        shell: true
      });
      
      daemon.unref();
      
      daemon.on('error', (error) => {
        reject(error);
      });
      
      // Give it time to start
      setTimeout(resolve, 5000);
    });
  }
}

async function waitForNode(maxAttempts = 20, interval = 2000) {
  console.log('\n⏳ Waiting for MultiChain node to be ready...');
  
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      const { stdout } = await executeCommand(`multichain-cli ${chainName} getinfo`, { 
        ignoreErrors: true,
        timeout: 5000
      });
      
      if (stdout && stdout.includes('chainname')) {
        console.log('✅ MultiChain node is ready!');
        return true;
      }
    } catch (error) {
      // Node not ready yet
    }
    
    console.log(`Attempt ${i}/${maxAttempts} - Waiting for node...`);
    await sleep(interval);
  }
  
  console.error('❌ Node failed to start after maximum attempts');
  return false;
}

async function createStreams() {
  console.log('\n📝 Creating streams...');
  
  for (const stream of REQUIRED_STREAMS) {
    console.log(`  Creating stream: ${stream}...`);
    try {
      await executeCommand(`multichain-cli ${chainName} create stream ${stream} false`, {
        ignoreErrors: true,
        timeout: 10000
      });
      console.log(`  ✅ Stream ${stream} created`);
      await sleep(500);
    } catch (error) {
      console.log(`  ℹ️  Stream ${stream} might already exist`);
    }
  }
}

async function subscribeToStreams() {
  console.log('\n📡 Subscribing to streams...');
  
  for (const streamName of REQUIRED_STREAMS) {
    try {
      // Check if stream exists first
      const { stdout: listStreams } = await executeCommand(`multichain-cli ${chainName} liststreams`, {
        ignoreErrors: true,
        timeout: 5000
      });
      
      if (listStreams && listStreams.trim()) {
        try {
          const streams = JSON.parse(listStreams);
          const streamExists = streams.some(s => s.name === streamName);
          
          if (!streamExists) {
            console.log(`⚠️ Stream '${streamName}' not found - will create it`);
            await executeCommand(`multichain-cli ${chainName} create stream ${streamName} false`, {
              ignoreErrors: true,
              timeout: 10000
            });
            console.log(`✅ Stream ${streamName} created`);
            await sleep(500);
          }
        } catch (parseError) {
          console.log(`⚠️ Could not parse stream list, will try to subscribe anyway`);
        }
      }
      
      // Now subscribe to the stream
      console.log(`📝 Subscribing to: ${streamName}...`);
      await executeCommand(`multichain-cli ${chainName} subscribe ${streamName}`, {
        ignoreErrors: false,
        timeout: 10000
      });
      console.log(`✅ Subscribed to ${streamName}`);
      await sleep(500);
      
    } catch (error) {
      console.error(`❌ Failed to subscribe to ${streamName}: ${error.message}`);
      console.log(`   You may need to subscribe manually: multichain-cli ${chainName} subscribe ${streamName}`);
    }
  }
  
  console.log('✅ All streams subscribed successfully');
}

async function verifyStreamSubscriptions() {
  console.log('\n🔍 Verifying stream subscriptions...');
  
  for (const streamName of REQUIRED_STREAMS) {
    try {
      const { stdout } = await executeCommand(`multichain-cli ${chainName} getstreaminfo ${streamName}`, {
        ignoreErrors: true,
        timeout: 5000
      });
      
      if (stdout && stdout.trim()) {
        try {
          const streamInfo = JSON.parse(stdout);
          const status = streamInfo.subscribed ? '✅ Subscribed' : '⚠️ Not subscribed';
          console.log(`   ${status} - ${streamName}: ${streamInfo.items || 0} items`);
          
          if (!streamInfo.subscribed) {
            // Retry subscription
            console.log(`   🔄 Retrying subscription for ${streamName}...`);
            await executeCommand(`multichain-cli ${chainName} subscribe ${streamName}`, {
              ignoreErrors: true,
              timeout: 10000
            });
            await sleep(500);
          }
        } catch (parseError) {
          console.log(`   ⚠️ Could not parse stream info for: ${streamName}`);
        }
      } else {
        console.log(`   ❌ Cannot access stream: ${streamName}`);
      }
    } catch (error) {
      console.log(`   ❌ Error verifying ${streamName}: ${error.message}`);
    }
  }
}

async function grantPermissions() {
  console.log('\n🔐 Granting permissions...');
  const defaultUser = process.env.MULTICHAIN_USER || 'multichainrpc';
  
  try {
    // Get the node's address first
    const { stdout: addresses } = await executeCommand(`multichain-cli ${chainName} getaddresses`, {
      ignoreErrors: true,
      timeout: 5000
    });
    
    if (addresses && addresses.trim()) {
      try {
        const addressList = JSON.parse(addresses);
        if (addressList && addressList.length > 0) {
          const nodeAddress = addressList[0];
          console.log(`📌 Node address: ${nodeAddress.substring(0, 10)}...`);
          
          // Grant mining permission to node address
          await executeCommand(
            `multichain-cli ${chainName} grant ${nodeAddress} mine`,
            { ignoreErrors: true, timeout: 10000 }
          );
          console.log(`✅ Mining permission granted to node address`);
        }
      } catch (parseError) {
        console.log('⚠️ Could not parse addresses');
      }
    }
    
    // Grant permissions to default user
    await executeCommand(
      `multichain-cli ${chainName} grant ${defaultUser} connect,send,receive,create,issue,mine,write,activate`,
      { ignoreErrors: true, timeout: 10000 }
    );
    console.log(`✅ Permissions granted to ${defaultUser}`);
    
    // Grant stream permissions
    for (const stream of REQUIRED_STREAMS) {
      await executeCommand(
        `multichain-cli ${chainName} grant ${defaultUser} write,activate ${stream}`,
        { ignoreErrors: true, timeout: 10000 }
      );
      console.log(`✅ Write permission granted for stream: ${stream}`);
      await sleep(300);
    }
    
  } catch (error) {
    console.log('⚠️  Could not grant permissions (may already be set)');
  }
}

async function showStreams() {
  try {
    const { stdout } = await executeCommand(`multichain-cli ${chainName} liststreams`, {
      ignoreErrors: true,
      timeout: 5000
    });
    
    if (stdout && stdout.trim()) {
      const streamsData = JSON.parse(stdout);
      console.log(`\n📋 Available Streams (${streamsData.length}):`);
      streamsData.forEach(stream => {
        const subscribed = stream.subscribed ? '✅' : '⚠️';
        console.log(`   ${subscribed} ${stream.name} (${stream.items || 0} items)`);
      });
    } else {
      console.log('\n📋 No streams available yet');
    }
  } catch (error) {
    console.log('Unable to list streams');
  }
}

async function verifyAndShowStatus() {
  console.log('\n🔍 Verifying setup...');
  await sleep(2000);
  
  try {
    const { stdout } = await executeCommand(`multichain-cli ${chainName} getinfo`, {
      timeout: 5000
    });
    
    if (stdout && stdout.trim()) {
      const chainInfo = JSON.parse(stdout);
      
      console.log('\n✅ SETUP COMPLETE!');
      console.log('═══════════════════════════════════════════');
      console.log(`📊 Blockchain Info:`);
      console.log(`   Chain: ${chainInfo.chainname}`);
      console.log(`   Version: ${chainInfo.protocolversion}`);
      console.log(`   Blocks: ${chainInfo.blocks}`);
      console.log(`   Connections: ${chainInfo.connections}`);
      console.log(`   Wallet Balance: ${chainInfo.walletbalance || 0}`);
      
      await showStreams();
      
      // Generate first block if needed
      if (chainInfo.blocks === 0) {
        console.log('\n⛏️ Generating initial block...');
        await generateInitialBlocks();
      }
    } else {
      console.log('\n⚠️ Setup complete but unable to verify');
    }
    
  } catch (error) {
    console.log('Unable to verify setup, but node should be running');
  }
}

async function generateInitialBlocks(count = 3) {
  try {
    console.log(`Generating ${count} initial block(s)...`);
    
    // Try to generate blocks
    const { stdout } = await executeCommand(`multichain-cli ${chainName} generate ${count}`, {
      ignoreErrors: true,
      timeout: 30000
    });
    
    if (stdout && stdout.trim()) {
      console.log(`✅ Generated ${count} block(s) successfully`);
      
      // Wait a moment for blocks to be processed
      await sleep(2000);
      
      // Show updated info
      const { stdout: updatedInfo } = await executeCommand(`multichain-cli ${chainName} getinfo`, {
        ignoreErrors: true,
        timeout: 5000
      });
      
      if (updatedInfo && updatedInfo.trim()) {
        const info = JSON.parse(updatedInfo);
        console.log(`📊 Current blocks: ${info.blocks}`);
      }
    }
  } catch (error) {
    console.log(`⚠️ Could not generate initial blocks: ${error.message}`);
    console.log(`   Blocks will be generated automatically if mining is enabled`);
  }
}

async function setupMultiChain() {
  console.log('\n═══════════════════════════════════════════');
  console.log('    MULTICHAIN SETUP UTILITY');
  console.log('═══════════════════════════════════════════\n');
  
  console.log(`Chain Name: ${chainName}`);
  console.log(`Chain Directory: ${chainDir}`);
  console.log(`Platform: ${process.platform}\n`);
  
  try {
    // Check if chain already exists and running
    let chainExists = fs.existsSync(chainDir);
    let chainRunning = false;
    
    if (chainExists) {
      console.log('⚠️  Chain directory exists. Checking if running...');
      
      try {
        const { stdout } = await executeCommand(`multichain-cli ${chainName} getinfo`, { 
          ignoreErrors: true,
          timeout: 5000
        });
        
        if (stdout && stdout.includes('chainname')) {
          console.log('✅ Chain is already running!');
          chainRunning = true;
        } else {
          console.log('Chain exists but not running. Starting it...');
        }
      } catch (error) {
        console.log('Chain exists but not running. Starting it...');
      }
    } else {
      // Create new chain
      console.log('\n📦 Creating new blockchain...');
      await executeCommand(`multichain-util create ${chainName}`);
      console.log('✅ Chain created successfully');
      chainExists = true;
    }
    
    // Start the daemon if not running
    if (!chainRunning) {
      console.log('\n🚀 Starting MultiChain daemon...');
      await startDaemon();
      
      // Wait for node to be ready
      const isReady = await waitForNode();
      if (!isReady) {
        // Try one more time with a different approach
        console.log('\n🔄 Trying alternative start method...');
        await executeCommand(`multichaind ${chainName} ${process.platform !== 'win32' ? '-daemon' : ''}`, { 
          ignoreErrors: true,
          timeout: 10000
        });
        await sleep(3000);
        
        const retryReady = await waitForNode(10, 2000);
        if (!retryReady) {
          throw new Error('Node failed to start');
        }
      }
    }
    
    // Create streams if this is a fresh setup
    if (!chainRunning) {
      await createStreams();
    }
    
    // Grant permissions (always do this to ensure they're set)
    await grantPermissions();
    
    // Subscribe to streams (always do this to ensure subscription)
    await subscribeToStreams();
    
    // Verify subscriptions
    await verifyStreamSubscriptions();
    
    // Verify and show status
    await verifyAndShowStatus();
    
    console.log('\n✨ MultiChain is ready to use! ✨');
    console.log('\nNext steps:');
    console.log('1. Update your .env file with:');
    console.log(`   MULTICHAIN_CHAINNAME=${chainName}`);
    console.log('2. Start your Node.js application');
    console.log('3. Test stream access:');
    console.log(`   multichain-cli ${chainName} liststreams`);
    console.log(`   multichain-cli ${chainName} subscribe audit_logs`);
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Check if MultiChain is installed: multichaind --version');
    
    if (process.platform === 'win32') {
      console.log('2. Check logs: type "%APPDATA%\\MultiChain\\*\\debug.log"');
      console.log('3. Try manual start: multichaind omph_hiv_chain');
      console.log('4. Check stream subscriptions manually:');
    } else {
      console.log('2. Check logs: tail -f ~/.multichain/*/debug.log');
      console.log('3. Try manual start: multichaind omph_hiv_chain -daemon');
      console.log('4. Check stream subscriptions manually:');
    }
    
    for (const stream of REQUIRED_STREAMS) {
      console.log(`   multichain-cli ${chainName} subscribe ${stream}`);
    }
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  setupMultiChain();
}

module.exports = { 
  setupMultiChain,
  subscribeToStreams,
  verifyStreamSubscriptions,
  REQUIRED_STREAMS,
  getChainDir
};