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

// Cross-platform lock file path
const getLockFile = () => {
  if (process.platform === 'win32') {
    return path.join(os.homedir(), 'AppData', 'Roaming', 'MultiChain', `${chainName}.lock`);
  } else {
    return path.join(os.homedir(), '.multichain', `${chainName}.lock`);
  }
};

const lockFile = getLockFile();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function executeCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command}`);
    // Use appropriate shell for Windows
    const execOptions = { 
      ...options, 
      shell: process.platform === 'win32' ? 'powershell.exe' : true,
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

async function confirmAction(message) {
  return new Promise((resolve) => {
    rl.question(`${message} (yes/no): `, (answer) => {
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

async function stopNodeWindows() {
  try {
    // Try graceful stop first
    await executeCommand(`multichain-cli ${chainName} stop`, { ignoreErrors: true });
    await sleep(3000);
    
    // Check if process is still running and kill if necessary
    const { stdout } = await executeCommand(
      `powershell -Command "Get-Process -Name multichaind -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id"`,
      { ignoreErrors: true }
    );
    
    if (stdout && stdout.trim()) {
      const processIds = stdout.trim().split('\n');
      for (const pid of processIds) {
        if (pid) {
          await executeCommand(`taskkill /F /PID ${pid}`, { ignoreErrors: true });
        }
      }
      console.log('✅ Force killed remaining processes');
    }
  } catch (error) {
    console.log('⚠️  No running processes found or unable to stop');
  }
}

async function stopNodeLinux() {
  try {
    // Try graceful stop first
    await executeCommand(`multichain-cli ${chainName} stop`, { ignoreErrors: true });
    await sleep(3000);
    
    // Kill any remaining processes
    await executeCommand(`pkill -f "multichaind.*${chainName}"`, { ignoreErrors: true });
    await sleep(1000);
    console.log('✅ Node stopped');
  } catch (error) {
    console.log('⚠️  Node was not running');
  }
}

async function resetMultiChain() {
  console.log('\n═══════════════════════════════════════════');
  console.log('    MULTICHAIN RESET UTILITY');
  console.log('═══════════════════════════════════════════\n');
  
  console.log(`Chain Name: ${chainName}`);
  console.log(`Chain Directory: ${chainDir}`);
  console.log(`Platform: ${process.platform}\n`);
  
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
    // Step 1: Stop the node based on platform
    console.log('\n🛑 Stopping MultiChain node...');
    
    if (process.platform === 'win32') {
      await stopNodeWindows();
    } else {
      await stopNodeLinux();
    }
    
    // Step 2: Delete chain directory
    console.log('\n🗑️  Deleting chain directory...');
    if (fs.existsSync(chainDir)) {
      try {
        // Cross-platform directory deletion
        fs.rmSync(chainDir, { recursive: true, force: true });
        console.log('✅ Chain directory deleted');
      } catch (rmError) {
        // Fallback for older Node.js versions
        if (fs.existsSync(chainDir)) {
          const deleteFolderRecursive = (folderPath) => {
            if (fs.existsSync(folderPath)) {
              fs.readdirSync(folderPath).forEach((file) => {
                const curPath = path.join(folderPath, file);
                if (fs.lstatSync(curPath).isDirectory()) {
                  deleteFolderRecursive(curPath);
                } else {
                  fs.unlinkSync(curPath);
                }
              });
              fs.rmdirSync(folderPath);
            }
          };
          deleteFolderRecursive(chainDir);
          console.log('✅ Chain directory deleted (fallback method)');
        }
      }
    }
    
    // Step 3: Clean any lock files
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
      console.log('✅ Lock file removed');
    }
    
    // Step 4: Clean Windows registry or temp files (if any)
    if (process.platform === 'win32') {
      const tempDir = path.join(os.tmpdir(), 'multichain');
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log('✅ Temp files cleaned');
      }
    }
    
    console.log('\n✨ RESET COMPLETE! ✨');
    console.log('\nTo set up a new chain, run:');
    console.log('  npm run blockchain:setup');
    console.log('  or');
    console.log('  node backend/scripts/setup-multichain.js');
    
    rl.close();
    return true;
    
  } catch (error) {
    console.error('\n❌ Reset failed:', error.message);
    console.log('\nManual cleanup instructions:');
    
    if (process.platform === 'win32') {
      console.log(`1. Stop node: multichain-cli ${chainName} stop`);
      console.log(`2. Kill process: taskkill /F /IM multichaind.exe`);
      console.log(`3. Delete directory: rmdir /S /Q "${chainDir}"`);
      console.log(`4. Delete lock file: del "${lockFile}"`);
    } else {
      console.log(`1. Stop node: multichain-cli ${chainName} stop`);
      console.log(`2. Kill process: pkill -f "multichaind.*${chainName}"`);
      console.log(`3. Delete directory: rm -rf ${chainDir}`);
      console.log(`4. Delete lock file: rm -f ${lockFile}`);
    }
    
    rl.close();
    return false;
  }
}

// Run reset if called directly
if (require.main === module) {
  resetMultiChain().catch(console.error);
}

module.exports = { resetMultiChain, getChainDir };