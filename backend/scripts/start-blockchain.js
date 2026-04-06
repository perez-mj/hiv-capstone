const { exec, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');

const chainName = process.env.MULTICHAIN_CHAINNAME || 'omph_hiv_chain';
const homeDir = os.homedir();
const chainDir = `${homeDir}/.multichain/${chainName}`;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function executeCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command}`);
    exec(command, { ...options, shell: true }, (error, stdout, stderr) => {
      if (error && !options.ignoreErrors) {
        console.error(`Error: ${error.message}`);
        reject(error);
      } else {
        if (stdout && stdout.trim()) console.log(stdout);
        if (stderr && !options.ignoreErrors && stderr.trim()) console.error(stderr);
        resolve({ stdout, stderr });
      }
    });
  });
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
  try {
    const { stdout } = await executeCommand(`multichain-cli ${chainName} getinfo`, {
      ignoreErrors: true,
      timeout: 5000
    });
    
    if (stdout && stdout.includes('chainname')) {
      console.log('✅ Blockchain is already running!');
      const info = JSON.parse(stdout);
      console.log(`\n📊 Status:`);
      console.log(`   Chain: ${info.chainname}`);
      console.log(`   Blocks: ${info.blocks}`);
      console.log(`   Connections: ${info.connections}`);
      return;
    }
  } catch (error) {
    // Not running, continue to start
  }
  
  // Start the daemon
  console.log('🚀 Starting MultiChain daemon...');
  
  // Use spawn to run in background
  const daemon = spawn('multichaind', [chainName, '-daemon'], {
    detached: true,
    stdio: 'ignore',
    shell: true
  });
  
  daemon.unref();
  
  // Wait for startup
  console.log('⏳ Waiting for node to be ready...');
  for (let i = 1; i <= 15; i++) {
    await sleep(2000);
    
    try {
      const { stdout } = await executeCommand(`multichain-cli ${chainName} getinfo`, {
        ignoreErrors: true,
        timeout: 5000
      });
      
      if (stdout && stdout.includes('chainname')) {
        console.log('✅ Blockchain started successfully!');
        const info = JSON.parse(stdout);
        console.log(`\n📊 Status:`);
        console.log(`   Chain: ${info.chainname}`);
        console.log(`   Blocks: ${info.blocks}`);
        console.log(`   Connections: ${info.connections}`);
        return;
      }
    } catch (error) {
      // Still starting
    }
    
    process.stdout.write(`   Attempt ${i}/15...\r`);
  }
  
  console.log('\n❌ Failed to start blockchain');
  console.log('Check logs: tail -f ~/.multichain/*/debug.log');
}

// Run if called directly
if (require.main === module) {
  startBlockchain();
}

module.exports = { startBlockchain };