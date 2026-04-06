const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

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
        if (stdout) console.log(stdout);
        if (stderr && !options.ignoreErrors) console.error(stderr);
        resolve({ stdout, stderr });
      }
    });
  });
}

async function confirmAction(message) {
  return new Promise((resolve) => {
    rl.question(`${message} (yes/no): `, (answer) => {
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

async function resetMultiChain() {
  console.log('\n═══════════════════════════════════════════');
  console.log('    MULTICHAIN RESET UTILITY');
  console.log('═══════════════════════════════════════════\n');
  
  console.log(`Chain Name: ${chainName}`);
  console.log(`Chain Directory: ${chainDir}\n`);
  
  // Check if chain exists
  if (!fs.existsSync(chainDir)) {
    console.log('❌ No existing chain found. Nothing to reset.');
    rl.close();
    return false;
  }
  
  const confirmed = await confirmAction('⚠️  WARNING: This will DELETE ALL blockchain data. Continue?');
  
  if (!confirmed) {
    console.log('\n❌ Reset cancelled by user');
    rl.close();
    return false;
  }
  
  try {
    // Step 1: Stop the node
    console.log('\n🛑 Stopping MultiChain node...');
    try {
      await executeCommand(`multichain-cli ${chainName} stop`, { ignoreErrors: true });
      await sleep(3000);
      console.log('✅ Node stopped');
    } catch (error) {
      console.log('⚠️  Node was not running');
    }
    
    // Step 2: Kill any remaining processes
    console.log('\n🔍 Checking for remaining processes...');
    try {
      await executeCommand(`pkill -f "multichaind.*${chainName}"`, { ignoreErrors: true });
      await sleep(1000);
    } catch (error) {
      // Ignore errors
    }
    
    // Step 3: Delete chain directory
    console.log('\n🗑️  Deleting chain directory...');
    if (fs.existsSync(chainDir)) {
      fs.rmSync(chainDir, { recursive: true, force: true });
      console.log('✅ Chain directory deleted');
    }
    
    // Step 4: Clean any lock files
    const lockFile = `${homeDir}/.multichain/${chainName}.lock`;
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
      console.log('✅ Lock file removed');
    }
    
    console.log('\n✨ RESET COMPLETE! ✨');
    console.log('\nTo set up a new chain, run:');
    console.log('  npm run blockchain:setup');
    console.log('  or');
    console.log('  node scripts/setup-multichain.js');
    
    rl.close();
    return true;
    
  } catch (error) {
    console.error('\n❌ Reset failed:', error.message);
    console.log('\nManual cleanup:');
    console.log(`1. Stop node: multichain-cli ${chainName} stop`);
    console.log(`2. Kill process: pkill -f "multichaind.*${chainName}"`);
    console.log(`3. Delete directory: rm -rf ${chainDir}`);
    rl.close();
    return false;
  }
}

// Run reset if called directly
if (require.main === module) {
  resetMultiChain();
}

module.exports = { resetMultiChain };