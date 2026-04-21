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
      maxBuffer: 10 * 1024 * 1024
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

async function stopBlockchainWindows() {
  console.log('\n═══════════════════════════════════════════');
  console.log('    STOPPING MULTICHAIN NODE');
  console.log('═══════════════════════════════════════════\n');
  
  // Check if chain exists
  if (!fs.existsSync(chainDir)) {
    console.log('⚠️  Blockchain does not exist');
    return;
  }
  
  // Check if running by looking for process
  const { stdout: processCheck } = await executeCommand(
    `powershell -Command "Get-Process -Name multichaind -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id"`,
    { ignoreErrors: true }
  );
  
  if (!processCheck || !processCheck.trim()) {
    console.log('⚠️  Blockchain is not running');
    return;
  }
  
  // Try to get blockchain info if node is responsive
  try {
    const { stdout } = await executeCommand(`multichain-cli ${chainName} getinfo`, {
      ignoreErrors: true,
      timeout: 5000
    });
    
    if (stdout && stdout.includes('chainname')) {
      const info = JSON.parse(stdout);
      console.log(`\n📊 Current Status:`);
      console.log(`   Chain: ${info.chainname}`);
      console.log(`   Blocks: ${info.blocks}`);
      console.log(`   Connections: ${info.connections}`);
    } else {
      console.log('\n⚠️  Node is running but not responding to commands');
    }
  } catch (error) {
    console.log('\n⚠️  Node is running but not responding to commands');
  }
  
  // Stop the node
  console.log('\n🛑 Stopping MultiChain node...');
  
  try {
    // Try graceful stop first
    await executeCommand(`multichain-cli ${chainName} stop`, {
      ignoreErrors: true,
      timeout: 10000
    });
    
    console.log('✅ Stop command sent');
    
    // Wait for shutdown
    console.log('⏳ Waiting for node to stop...');
    let stopped = false;
    
    for (let i = 1; i <= 10; i++) {
      await sleep(1000);
      
      const { stdout: checkProcess } = await executeCommand(
        `powershell -Command "Get-Process -Name multichaind -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id"`,
        { ignoreErrors: true }
      );
      
      if (!checkProcess || !checkProcess.trim()) {
        console.log('\n✅ Blockchain stopped successfully');
        stopped = true;
        break;
      }
      
      process.stdout.write(`   Waiting... ${i}/10\r`);
    }
    
    if (stopped) return;
    
    // Force kill if still running
    console.log('\n⚠️  Force killing remaining processes...');
    const { stdout: processIds } = await executeCommand(
      `powershell -Command "Get-Process -Name multichaind -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id"`,
      { ignoreErrors: true }
    );
    
    if (processIds && processIds.trim()) {
      const pids = processIds.trim().split('\n');
      for (const pid of pids) {
        if (pid) {
          await executeCommand(`taskkill /F /PID ${pid}`, { ignoreErrors: true });
          console.log(`✅ Killed process ${pid}`);
        }
      }
    }
    
    console.log('✅ Blockchain force stopped');
    
  } catch (error) {
    console.error('❌ Failed to stop blockchain:', error.message);
    
    // Force kill as last resort
    console.log('Attempting force kill...');
    const { stdout: processIds } = await executeCommand(
      `powershell -Command "Get-Process -Name multichaind -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id"`,
      { ignoreErrors: true }
    );
    
    if (processIds && processIds.trim()) {
      const pids = processIds.trim().split('\n');
      for (const pid of pids) {
        if (pid) {
          await executeCommand(`taskkill /F /PID ${pid}`, { ignoreErrors: true });
          console.log(`✅ Killed process ${pid}`);
        }
      }
    }
    
    console.log('✅ Blockchain force stopped');
  }
}

async function stopBlockchainLinux() {
  console.log('\n═══════════════════════════════════════════');
  console.log('    STOPPING MULTICHAIN NODE');
  console.log('═══════════════════════════════════════════\n');
  
  // Check if chain exists
  if (!fs.existsSync(chainDir)) {
    console.log('⚠️  Blockchain does not exist');
    return;
  }
  
  // Check if running
  try {
    const { stdout } = await executeCommand(`multichain-cli ${chainName} getinfo`, {
      ignoreErrors: true,
      timeout: 5000
    });
    
    if (!stdout || !stdout.includes('chainname')) {
      console.log('⚠️  Blockchain is not running');
      return;
    }
    
    const info = JSON.parse(stdout);
    console.log(`\n📊 Current Status:`);
    console.log(`   Chain: ${info.chainname}`);
    console.log(`   Blocks: ${info.blocks}`);
    console.log(`   Connections: ${info.connections}`);
    
  } catch (error) {
    console.log('⚠️  Blockchain is not running');
    return;
  }
  
  // Stop the node
  console.log('\n🛑 Stopping MultiChain node...');
  
  try {
    await executeCommand(`multichain-cli ${chainName} stop`, {
      timeout: 10000
    });
    
    console.log('✅ Stop command sent');
    
    // Wait for shutdown
    console.log('⏳ Waiting for node to stop...');
    for (let i = 1; i <= 10; i++) {
      await sleep(1000);
      
      try {
        await executeCommand(`multichain-cli ${chainName} getinfo`, {
          ignoreErrors: true,
          timeout: 2000
        });
        process.stdout.write(`   Waiting... ${i}/10\r`);
      } catch (error) {
        console.log('\n✅ Blockchain stopped successfully');
        return;
      }
    }
    
    // Force kill if still running
    console.log('\n⚠️  Force killing remaining processes...');
    await executeCommand(`pkill -f "multichaind.*${chainName}"`, {
      ignoreErrors: true
    });
    
    console.log('✅ Blockchain stopped');
    
  } catch (error) {
    console.error('❌ Failed to stop blockchain:', error.message);
    
    // Force kill
    console.log('Attempting force kill...');
    await executeCommand(`pkill -9 -f "multichaind.*${chainName}"`, {
      ignoreErrors: true
    });
    console.log('✅ Blockchain force stopped');
  }
}

async function stopBlockchain() {
  if (process.platform === 'win32') {
    await stopBlockchainWindows();
  } else {
    await stopBlockchainLinux();
  }
}

// Run if called directly
if (require.main === module) {
  stopBlockchain().catch(error => {
    console.error('Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = { stopBlockchain, getChainDir };