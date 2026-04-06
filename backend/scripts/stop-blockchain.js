const { exec } = require('child_process');
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

async function stopBlockchain() {
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

// Run if called directly
if (require.main === module) {
  stopBlockchain();
}

module.exports = { stopBlockchain };