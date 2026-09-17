#!/usr/bin/env node
/**
 * MultiChain node control script (Node.js)
 *
 * Usage:
 *   node scripts/multichain.js <command> [chain] [options]
 *
 * Commands:
 *   init      Create a new MultiChain chain + write multichain.conf, then start
 *   start     Start the MultiChain daemon
 *   stop      Gracefully stop the daemon
 *   restart   Stop then start
 *   status    Show running status + getinfo + getblockchaininfo
 *   logs      Tail debug.log (last 200 lines, follows)
 *   doctor    Dump env, paths, and binary locations
 *   cli ...   Run arbitrary multichain-cli command
 *
 * Options:
 *   --force             (init only) wipe existing chain, keep a timestamped backup
 *   --connect <host:port>  (init only) create as a member of an existing chain
 *
 * Config sources:
 *   - backend/.env                     (loaded first)
 *   - backend/config/blockchain.js     (host/port/chain/user/password)
 *
 * Environment overrides:
 *   MULTICHAIN_HOME      default: $HOME/.multichain
 *   MULTICHAIND_BIN      default: multichaind
 *   MULTICHAIN_CLI_BIN   default: multichain-cli
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const blockchainConfig = require('../config/blockchain');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const CHAIN = blockchainConfig.chain;
const MULTICHAIN_HOME =
  process.env.MULTICHAIN_HOME || path.join(os.homedir(), '.multichain');
const CHAIN_DIR = path.join(MULTICHAIN_HOME, CHAIN);
const DATADIR = MULTICHAIN_HOME;
const PID_FILE = path.join(CHAIN_DIR, 'multichain.pid');
const LOG_FILE = path.join(CHAIN_DIR, 'debug.log');
const PORT     = String(blockchainConfig.port);
const RPC_PORT = String(blockchainConfig.rpcPort);
const RPC_HOST = blockchainConfig.host;
const RPC_USER = blockchainConfig.user;
const RPC_PASSWORD = blockchainConfig.password;

const MULTICHAIND_BIN = process.env.MULTICHAIND_BIN || 'multichaind';
const MULTICHAIN_CLI_BIN = process.env.MULTICHAIN_CLI_BIN || 'multichain-cli';

// Colors
const C = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  dim: '\x1b[2m',
  reset: '\x1b[0m',
};
const log = (m) => console.log(`${C.blue}[multichain]${C.reset} ${m}`);
const ok = (m) => console.log(`${C.green}✔${C.reset} ${m}`);
const warn = (m) => console.log(`${C.yellow}⚠${C.reset} ${m}`);
const err = (m) => console.error(`${C.red}✘${C.reset} ${m}`);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function binaryExists(bin) {
  const cmd = process.platform === 'win32' ? 'where' : 'which';
  const r = spawnSync(cmd, [bin], { stdio: 'ignore' });
  return r.status === 0;
}

function binaryPath(bin) {
  const cmd = process.platform === 'win32' ? 'where' : 'which';
  const r = spawnSync(cmd, [bin], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim().split('\n')[0] : '(not found)';
}

function requireBin(bin) {
  if (!binaryExists(bin)) {
    err(`Required binary '${bin}' not found in PATH.`);
    err(`Install MultiChain or set an override env var (see 'doctor').`);
    process.exit(1);
  }
}

function chainExists() {
  return fs.existsSync(CHAIN_DIR) && fs.statSync(CHAIN_DIR).isDirectory();
}

function readPid() {
  try {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
    return Number.isFinite(pid) ? pid : null;
  } catch {
    return null;
  }
}

function isRunning() {
  const pid = readPid();
  if (pid) {
    try {
      process.kill(pid, 0); // signal 0 = existence check
      return true;
    } catch {
      // stale pid file
    }
  }
  // Fallback: pgrep (Unix only)
  if (process.platform !== 'win32') {
    const r = spawnSync('pgrep', ['-f', `${MULTICHAIND_BIN}.*${CHAIN}`], {
      stdio: 'ignore',
    });
    return r.status === 0;
  }
  return false;
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * Run multichain-cli with the chain + RPC creds.
 */
function rpc(args) {
  const finalArgs = [
  CHAIN,
  `-rpcuser=${RPC_USER}`,
  `-rpcpassword=${RPC_PASSWORD}`,
  `-rpcport=${RPC_PORT}`,  
  `-rpchost=${RPC_HOST}`,
  ...args,
];
  const r = spawnSync(MULTICHAIN_CLI_BIN, finalArgs, { encoding: 'utf8' });
  return {
    ok: r.status === 0,
    stdout: (r.stdout || '').trim(),
    stderr: (r.stderr || '').trim(),
    status: r.status,
  };
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

// --- init ------------------------------------------------------------------
async function cmdInit(opts = {}) {
  const { force = false, connectTo = null } = opts;

  requireBin('multichain-util');
  requireBin(MULTICHAIND_BIN);
  requireBin(MULTICHAIN_CLI_BIN);

  console.log('──────────────────────────────────────────────');
  console.log(` Initializing chain : ${CHAIN}`);
  console.log(` MULTICHAIN_HOME    : ${MULTICHAIN_HOME}`);
  console.log(` Chain dir          : ${CHAIN_DIR}`);
  console.log(` RPC port           : ${PORT}`);
  console.log(` RPC user           : ${RPC_USER}`);
  console.log(` Connect to         : ${connectTo || '(self — new chain)'}`);
  console.log('──────────────────────────────────────────────');

  // Guard: existing chain
  if (fs.existsSync(CHAIN_DIR)) {
    if (force) {
      warn(`Chain '${CHAIN}' already exists at ${CHAIN_DIR} — --force given.`);
      if (isRunning()) {
        warn('Chain is running — stopping first so we can wipe safely.');
        await cmdStop();
      }
      const backup = `${CHAIN_DIR}.bak.${Date.now()}`;
      log(`Moving existing chain to ${backup}`);
      fs.renameSync(CHAIN_DIR, backup);
    } else {
      err(`Chain '${CHAIN}' already exists at ${CHAIN_DIR}`);
      err('Use --force to wipe and re-create (a timestamped backup is kept).');
      process.exit(1);
    }
  }

  fs.mkdirSync(MULTICHAIN_HOME, { recursive: true });

  // -------------------------------------------------------------------------
  // Step 1: multichain-util create
  // -------------------------------------------------------------------------
  log('Creating chain with multichain-util...');
  const createArgs = ['create', CHAIN];
  if (connectTo) {
    createArgs.push('-connect', connectTo);
  }
  const created = spawnSync('multichain-util', createArgs, {
    stdio: 'inherit',
    env: { ...process.env, HOME: os.homedir() },
  });
  if (created.status !== 0) {
    err(`multichain-util create failed (exit ${created.status}).`);
    process.exit(created.status || 1);
  }

  if (!fs.existsSync(CHAIN_DIR)) {
    err(`Expected chain dir ${CHAIN_DIR} was not created.`);
    process.exit(1);
  }
  ok(`Chain directory created: ${CHAIN_DIR}`);

  // -------------------------------------------------------------------------
  // Step 2: per-chain multichain.conf
  // -------------------------------------------------------------------------
  const confPath = path.join(CHAIN_DIR, 'multichain.conf');
  const confBody = [
  `# Auto-generated by scripts/multichain.js on ${new Date().toISOString()}`,
  `rpcuser=${RPC_USER}`,
  `rpcpassword=${RPC_PASSWORD}`,
  `rpcport=${RPC_PORT}`,
  `rpcallowip=127.0.0.1`,
  `port=${PORT}`,
  ``,
].join('\n');

  fs.writeFileSync(confPath, confBody, { mode: 0o600 });
  ok(`Wrote ${confPath}`);

  // -------------------------------------------------------------------------
  // Step 3: user-level ~/.multichain/multichain.conf
  //   Lets multichain-cli find creds without flags.
  // -------------------------------------------------------------------------
  const userConfPath = path.join(MULTICHAIN_HOME, 'multichain.conf');
  const userConfBody = [
    `# Auto-generated by scripts/multichain.js on ${new Date().toISOString()}`,
    `rpcuser=${RPC_USER}`,
    `rpcpassword=${RPC_PASSWORD}`,
    `rpcport=${RPC_PORT}`,
    `rpcallowip=127.0.0.1`,
    ``,
  ].join('\n');
  fs.writeFileSync(userConfPath, userConfBody, { mode: 0o600 });
  ok(`Wrote ${userConfPath}`);

  // -------------------------------------------------------------------------
  // Step 4: sanity check params.dat
  // -------------------------------------------------------------------------
  const paramsPath = path.join(CHAIN_DIR, 'params.dat');
  if (!fs.existsSync(paramsPath)) {
    warn('params.dat missing — multichain-util may have failed silently.');
  } else {
    ok('params.dat present');
  }

  // -------------------------------------------------------------------------
  // Step 5: start the node to prime the blockchain
  // -------------------------------------------------------------------------
  log('Starting node to prime the blockchain...');
  await cmdStart();

  // Wait for RPC to be fully responsive
  for (let i = 0; i < 15; i++) {
    if (rpc(['getinfo']).ok) break;
    await sleep(1000);
  }

  const info = rpc(['getinfo']);
  if (info.ok) {
    console.log('\ngetinfo after init:');
    console.log(info.stdout.split('\n').map((l) => '  ' + l).join('\n'));
  }

  ok(`Chain '${CHAIN}' initialized and running.`);
  console.log();
  console.log('Next steps:');
  console.log('  - Check status:      npm run mc:status');
  console.log('  - Run CLI commands:  npm run mc:cli -- getinfo');
  console.log('  - Stop:              npm run mc:stop');
}


// ---------------------------------------------------------------------------
// Stream: create (idempotent)
// ---------------------------------------------------------------------------
function cmdStreamCreate() {
  requireBin(MULTICHAIN_CLI_BIN);

  if (!isRunning()) {
    err(`MultiChain '${CHAIN}' is not running. Start it first: npm run mc:start`);
    process.exit(1);
  }

  const streamName = process.env.BLOCKCHAIN_STREAM || 'patient_audit';

  // Already exists?
  const existing = rpc(['liststreams', streamName]);
  if (existing.ok && existing.stdout && existing.stdout !== '[]' && existing.stdout !== 'null') {
    ok(`Stream '${streamName}' already exists.`);
    console.log(`${C.dim}${existing.stdout}${C.reset}`);
    return;
  }

  log(`Creating stream '${streamName}' (open=false, i.e. only granted writers)...`);

  // 1. create stream <name> <open>
  const created = rpc(['create', 'stream', streamName, 'false']);
  if (!created.ok) {
    err(`Failed to create stream: ${created.stderr || created.stdout}`);
    process.exit(1);
  }
  ok(`Stream '${streamName}' created.`);

  // 2. Determine this node's address and grant write + read
const addrs = rpc(['getaddresses']);

if (!addrs.ok) {
  err(`Could not list addresses: ${addrs.stderr || addrs.stdout}`);
  process.exit(1);
}

let addrList = [];
try {
  addrList = JSON.parse(addrs.stdout);
} catch {
  /* ignore */
}

if (!addrList.length) {
  err('No addresses found on this node. Is the wallet unlocked / does it have a default address?');
  process.exit(1);
}

const addr = addrList[0];

log(`Granting write and read to ${addr}...`);

const granted = rpc([
  'grant',
  addr,
  `${streamName}.write,read`
]);

if (!granted.ok) {
  err(`Grant failed: ${granted.stderr || granted.stdout}`);
  process.exit(1);
}

ok(`Granted 'write,read' on '${streamName}' to ${addr}.`);

  // 3. Subscribe so this node actually receives items (matters for multi-node later)
  const sub = rpc(['subscribe', streamName]);
  if (sub.ok) ok(`Subscribed to stream '${streamName}'.`);

  console.log();
  console.log('Next steps:');
  console.log(`  - List streams:    npm run mc:cli -- liststreams`);
  console.log(`  - Stream info:     npm run mc:cli -- getstreaminfo ${streamName}`);
  console.log(`  - Publish a test:  npm run mc:cli -- publish ${streamName} test-key 74657374`);
}

// ---------------------------------------------------------------------------
// Stream: show info + latest items (for debugging)
// ---------------------------------------------------------------------------
function cmdStreamStatus() {
  requireBin(MULTICHAIN_CLI_BIN);
  if (!isRunning()) {
    err(`MultiChain '${CHAIN}' is not running.`);
    process.exit(1);
  }

  const streamName = process.env.BLOCKCHAIN_STREAM || 'patient_audit';

  const info = rpc(['getstreaminfo', streamName]);
  if (!info.ok) {
    warn(`Stream '${streamName}' not found or unreadable.`);
    if (info.stderr) console.log(`${C.dim}${info.stderr}${C.reset}`);
    console.log(`Create it with:  npm run mc:stream:create`);
    return;
  }

  console.log('──────────────────────────────────────────────');
  console.log(` Stream       : ${streamName}`);
  console.log('──────────────────────────────────────────────');
  console.log('getstreaminfo:');
  console.log(info.stdout.split('\n').map((l) => '  ' + l).join('\n'));

  const items = rpc(['liststreamitems', streamName, 'false', '5']);
  if (items.ok) {
    console.log('\nLast 5 items:');
    console.log(items.stdout.split('\n').map((l) => '  ' + l).join('\n'));
  }
}

// ---------------------------------------------------------------------------
// Stream: subscribe this node (safe to re-run)
// ---------------------------------------------------------------------------
function cmdStreamSubscribe() {
  requireBin(MULTICHAIN_CLI_BIN);
  if (!isRunning()) {
    err(`MultiChain '${CHAIN}' is not running.`);
    process.exit(1);
  }
  const streamName = process.env.BLOCKCHAIN_STREAM || 'patient_audit';
  const r = rpc(['subscribe', streamName]);
  if (!r.ok) {
    err(`Subscribe failed: ${r.stderr || r.stdout}`);
    process.exit(1);
  }
  ok(`Subscribed to '${streamName}'.`);
}

// --- start -----------------------------------------------------------------
async function cmdStart() {
  requireBin(MULTICHAIND_BIN);

  if (!chainExists()) {
    err(`Chain '${CHAIN}' not found at ${CHAIN_DIR}`);
    err(`Create it first:  npm run mc:init`);
    process.exit(1);
  }

  if (isRunning()) {
    warn(`MultiChain '${CHAIN}' is already running (pid ${readPid() ?? '?'}).`);
    return;
  }

  // Pre-flight: is the port already taken?
  if (process.platform !== 'win32') {
    const r = spawnSync('ss', ['-tlnp'], { encoding: 'utf8' });
    if (r.status === 0 && r.stdout.includes(`:${PORT} `)) {
      const owner = r.stdout
        .split('\n')
        .find((l) => l.includes(`:${PORT} `));
      err(`Port ${PORT} is already in use:`);
      console.error(`  ${owner.trim()}`);
      err('Change BLOCKCHAIN_PORT in backend/.env, or stop the other process.');
      process.exit(1);
    }
  }

  log(`Starting MultiChain '${CHAIN}' (P2P: ${PORT}, RPC: ${RPC_PORT})...`);
  fs.mkdirSync(CHAIN_DIR, { recursive: true });

  // Launch WITHOUT -daemon, redirect output to a file, and detach with setsid.
  // This is far more reliable than MultiChain's own -daemon flag.
  const outLog = path.join(CHAIN_DIR, 'multichaind.out.log');
  const errLog = path.join(CHAIN_DIR, 'multichaind.err.log');
  const outFd = fs.openSync(outLog, 'a');
  const errFd = fs.openSync(errLog, 'a');

  const args = [
    CHAIN,
    `-datadir=${MULTICHAIN_HOME}`, 
    `-port=${PORT}`,
    `-rpcuser=${RPC_USER}`,
    `-rpcpassword=${RPC_PASSWORD}`,
    `-rpcport=${RPC_PORT}`,
    '-rpcallowip=127.0.0.1',
    '-printtoconsole',
    '-daemon=0', 
  ];

  let spawnCmd = MULTICHAIND_BIN;
  let spawnArgs = args;

  // Prefer setsid so the daemon survives our process exiting
  if (process.platform !== 'win32' && binaryExists('setsid')) {
    spawnCmd = 'setsid';
    spawnArgs = [MULTICHAIND_BIN, ...args];
  }

  const child = spawn(spawnCmd, spawnArgs, {
    detached: true,
    stdio: ['ignore', outFd, errFd],
    cwd: CHAIN_DIR,
  });
  child.unref();
  fs.closeSync(outFd);
  fs.closeSync(errFd);

  log(`Launched PID ${child.pid}. Waiting for RPC on ${RPC_HOST}:${RPC_PORT}...`);

  // Wait for RPC to come up (max 60s — first run mines genesis)
  for (let i = 0; i < 60; i++) {
    await sleep(1000);

    // If RPC answers, write PID file and complete successfully
    if (rpc(['getinfo']).ok) {
      try {
        fs.writeFileSync(PID_FILE, String(child.pid));
      } catch {
        /* ignore */
      }
      ok(`MultiChain '${CHAIN}' started (pid ${child.pid}).`);
      return;
    }

    if (i % 5 === 4) {
      log(`  still waiting for RPC... (${i + 1}s)`);
    }
  }

  err(`Timed out waiting for RPC on ${RPC_HOST}:${PORT}.`);
  showTail(errLog);
  showTail(outLog);
  showTail(LOG_FILE);
  process.exit(1);
}

// --- helper: print last N lines of a file if it exists ----------------------
function showTail(file, n = 30) {
  if (!fs.existsSync(file)) return;
  console.log(`\n${C.dim}── last ${n} lines of ${file} ──${C.reset}`);
  const r = spawnSync('tail', ['-n', String(n), file], { encoding: 'utf8' });
  if (r.status === 0 && r.stdout.trim()) {
    console.log(r.stdout.trimEnd());
  } else {
    console.log('(empty)');
  }
}

// --- stop ------------------------------------------------------------------
async function cmdStop() {
  if (!isRunning()) {
    warn(`MultiChain '${CHAIN}' is not running.`);
    try { fs.unlinkSync(PID_FILE); } catch { /* ignore */ }
    return;
  }

  log(`Stopping MultiChain '${CHAIN}'...`);

  // Try graceful RPC stop first
  if (binaryExists(MULTICHAIN_CLI_BIN) && rpc(['stop']).ok) {
    for (let i = 0; i < 30; i++) {
      if (!isRunning()) break;
      await sleep(1000);
    }
  }

  // Escalate to SIGTERM using our PID file
  if (isRunning()) {
    const pid = readPid();
    if (pid) {
      warn(`RPC stop didn't work — sending SIGTERM to pid ${pid}.`);
      try { process.kill(pid, 'SIGTERM'); } catch { /* ignore */ }
    } else if (process.platform !== 'win32') {
      warn('No PID file — falling back to pkill.');
      spawnSync('pkill', ['-TERM', '-f', `${MULTICHAIND_BIN}.*${CHAIN}`]);
    }
    await sleep(3000);
  }

  // Last resort: SIGKILL
  if (isRunning()) {
    const pid = readPid();
    if (pid) {
      warn(`Still alive — sending SIGKILL to pid ${pid}.`);
      try { process.kill(pid, 'SIGKILL'); } catch { /* ignore */ }
    } else if (process.platform !== 'win32') {
      spawnSync('pkill', ['-KILL', '-f', `${MULTICHAIND_BIN}.*${CHAIN}`]);
    }
    await sleep(1000);
  }

  if (isRunning()) {
    err(`Failed to stop MultiChain '${CHAIN}'.`);
    process.exit(1);
  }

  try { fs.unlinkSync(PID_FILE); } catch { /* ignore */ }
  ok(`MultiChain '${CHAIN}' stopped.`);
}

// --- restart ---------------------------------------------------------------
async function cmdRestart() {
  await cmdStop();
  await sleep(2000);
  await cmdStart();
}

// --- status ----------------------------------------------------------------
function cmdStatus() {
  console.log('──────────────────────────────────────────────');
  console.log(` Chain         : ${CHAIN}`);
  console.log(` Data dir      : ${CHAIN_DIR}`);
  console.log(` RPC endpoint  : http://${RPC_HOST}:${PORT}`);
  console.log(` RPC user      : ${RPC_USER}`);
  console.log(` Log file      : ${LOG_FILE}`);
  console.log(` multichaind   : ${MULTICHAIND_BIN}  (found: ${binaryExists(MULTICHAIND_BIN)})`);
  console.log(` multichain-cli: ${MULTICHAIN_CLI_BIN}  (found: ${binaryExists(MULTICHAIN_CLI_BIN)})`);
  console.log('──────────────────────────────────────────────');

  if (!fs.existsSync(CHAIN_DIR)) {
    err(`Chain directory does not exist: ${CHAIN_DIR}`);
    warn(`Create it first:  npm run mc:init`);
    process.exit(1);
  }

  // Directory listing so we can see what's actually there
  try {
    const entries = fs.readdirSync(CHAIN_DIR);
    console.log(` Chain dir contents (${entries.length}):`);
    entries.forEach((e) => console.log(`   - ${e}`));
  } catch (e) {
    warn(`Could not read chain dir: ${e.message}`);
  }
  console.log('──────────────────────────────────────────────');

  if (!isRunning()) {
    warn('Status: STOPPED');
    process.exit(1);
  }

  ok('Status: RUNNING');

  if (!binaryExists(MULTICHAIN_CLI_BIN)) {
    warn(`Cannot query RPC: '${MULTICHAIN_CLI_BIN}' not in PATH.`);
    return;
  }

  const info = rpc(['getinfo']);
  if (!info.ok) {
    warn(`RPC getinfo failed (status=${info.status}).`);
    if (info.stderr) console.log(`${C.dim}${info.stderr}${C.reset}`);
    return;
  }
  console.log('\ngetinfo:');
  console.log(info.stdout.split('\n').map((l) => '  ' + l).join('\n'));

  const bc = rpc(['getblockchaininfo']);
  if (bc.ok) {
    console.log('\ngetblockchaininfo:');
    console.log(bc.stdout.split('\n').map((l) => '  ' + l).join('\n'));
  }
}

// --- logs ------------------------------------------------------------------
function cmdLogs() {
  if (!fs.existsSync(LOG_FILE)) {
    err(`No log file at ${LOG_FILE}`);
    process.exit(1);
  }
  const tail = spawn('tail', ['-n', '200', '-f', LOG_FILE], {
    stdio: 'inherit',
  });
  tail.on('exit', (code) => process.exit(code ?? 0));
}

// --- doctor ----------------------------------------------------------------
function cmdDoctor() {
  console.log('=== MultiChain environment doctor ===\n');

  console.log(` Node        : ${process.version}`);
  console.log(` Platform    : ${process.platform} ${process.arch}`);
  console.log(` CWD         : ${process.cwd()}`);
  console.log(` Script dir  : ${__dirname}`);
  const envPath = path.join(__dirname, '..', '.env');
  console.log(` .env file   : ${envPath} (exists: ${fs.existsSync(envPath)})`);
  console.log();

  console.log('Resolved config (config/blockchain.js + .env):');
  console.log(`   host     = ${RPC_HOST}`);
  console.log(`   port     = ${PORT}`);
  console.log(`   chain    = ${CHAIN}`);
  console.log(`   user     = ${RPC_USER}`);
  console.log(`   password = ${RPC_PASSWORD ? '***set***' : '(empty!)'}`);
  console.log();

  console.log(` MULTICHAIN_HOME : ${MULTICHAIN_HOME} (exists: ${fs.existsSync(MULTICHAIN_HOME)})`);
  console.log(` CHAIN_DIR       : ${CHAIN_DIR} (exists: ${fs.existsSync(CHAIN_DIR)})`);
  console.log(` LOG_FILE        : ${LOG_FILE} (exists: ${fs.existsSync(LOG_FILE)})`);
  console.log(` PID_FILE        : ${PID_FILE} (exists: ${fs.existsSync(PID_FILE)})`);
  console.log();

  console.log(`${MULTICHAIND_BIN}  -> ${binaryPath(MULTICHAIND_BIN)}`);
  console.log(`${MULTICHAIN_CLI_BIN} -> ${binaryPath(MULTICHAIN_CLI_BIN)}`);
  console.log(`multichain-util -> ${binaryPath('multichain-util')}`);
  console.log();

  if (fs.existsSync(MULTICHAIN_HOME)) {
    console.log(`Chains under ${MULTICHAIN_HOME}:`);
    try {
      fs.readdirSync(MULTICHAIN_HOME, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .forEach((d) => console.log(`   - ${d.name}`));
    } catch (e) {
      console.log(`   (could not list: ${e.message})`);
    }
  }
}

// --- cli -------------------------------------------------------------------
function cmdCli(extraArgs) {
  requireBin(MULTICHAIN_CLI_BIN);
  if (!extraArgs.length) {
    err('No CLI arguments provided. Example: npm run mc:cli -- getinfo');
    process.exit(1);
  }
  const r = spawnSync(
    MULTICHAIN_CLI_BIN,
    [
      CHAIN,
      `-rpcuser=${RPC_USER}`,
      `-rpcpassword=${RPC_PASSWORD}`,
      `-rpcport=${RPC_PORT}`, // Fixed: change PORT to RPC_PORT
      `-rpchost=${RPC_HOST}`,
      ...extraArgs,
    ],
    { stdio: 'inherit' }
  );
  process.exit(r.status ?? 0);
}

// --- usage -----------------------------------------------------------------
function usage() {
  console.log(`
MultiChain node control script

Usage:
  node scripts/multichain.js <command> [chain] [options]

Commands:
  init        Create a new MultiChain chain + write multichain.conf, then start
  start       Start the MultiChain daemon
  stop        Gracefully stop the daemon
  restart     Stop then start
  status      Show running status + getinfo
  logs        Tail debug.log (last 200 lines, follows)
  doctor      Dump env, paths, and binary locations
  cli ...     Run a multichain-cli command (e.g. cli getinfo)

Options:
  --force                  (init only) wipe existing chain, keep timestamped backup
  --connect <host:port>    (init only) create as a member of an existing chain

Config sources:
  - backend/.env
  - backend/config/blockchain.js

Overrides:
  MULTICHAIN_HOME      default: $HOME/.multichain
  MULTICHAIND_BIN      default: multichaind
  MULTICHAIN_CLI_BIN   default: multichain-cli
`);
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------
(async () => {
  const argv = process.argv.slice(2);
  const command = argv[0];
  const rest = argv.slice(1);

  const force = rest.includes('--force');
  const connectIdx = rest.indexOf('--connect');
  const connectTo = connectIdx >= 0 ? rest[connectIdx + 1] : null;

    switch (command) {
    case 'init':
      await cmdInit({ force, connectTo });
      break;
    case 'start':
      await cmdStart();
      break;
    case 'stop':
      await cmdStop();
      break;
    case 'restart':
      await cmdRestart();
      break;
    case 'status':
      cmdStatus();
      break;
    case 'logs':
      cmdLogs();
      break;
    case 'doctor':
      cmdDoctor();
      break;

    // --- NEW: stream management ---
    case 'stream:create':
      cmdStreamCreate();
      break;
    case 'stream:status':
      cmdStreamStatus();
      break;
    case 'stream:subscribe':
      cmdStreamSubscribe();
      break;

    case 'cli':
      cmdCli(rest.filter((a) => !a.startsWith('--')));
      break;
    case undefined:
    case '-h':
    case '--help':
    case 'help':
      usage();
      break;
    default:
      err(`Unknown command: ${command}`);
      console.log();
      usage();
      process.exit(1);
  }
})().catch((e) => {
  err(e.message || String(e));
  process.exit(1);
});