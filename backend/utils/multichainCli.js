// backend/utils/multichainCli.js
'use strict';

const { spawnSync } = require('child_process');
const crypto = require('crypto');
const blockchainConfig = require('../config/blockchain');
const logger = require('./logger');

const CHAIN     = blockchainConfig.chain;
const HOST      = blockchainConfig.host;
const RPC_PORT  = String(blockchainConfig.rpcPort);
const USER      = blockchainConfig.user;
const PASSWORD  = blockchainConfig.password;

const CLI = process.env.MULTICHAIN_CLI_BIN || 'multichain-cli';
const TIMEOUT_MS = parseInt(process.env.MULTICHAIN_CLI_TIMEOUT_MS || '15000', 10);

/**
 * Run a multichain-cli command. Throws on failure.
 * @param {string[]} args
 * @param {{ json?: boolean }} [opts]
 */
function run(args, opts = {}) {
  const { json = false } = opts;
  const finalArgs = [
    CHAIN,
    `-rpcuser=${USER}`,
    `-rpcpassword=${PASSWORD}`,
    `-rpchost=${HOST}`,
    `-rpcport=${RPC_PORT}`,
    ...args
  ];

  const r = spawnSync(CLI, finalArgs, { encoding: 'utf8', timeout: TIMEOUT_MS });
  const stdout = (r.stdout || '').trim();
  const stderr = (r.stderr || '').trim();

  if (r.error) throw new Error(`multichain-cli spawn error: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`multichain-cli failed: ${stderr || stdout || `exit ${r.status}`}`);

  if (!json) return stdout;
  if (!stdout) return null;
  try {
    return JSON.parse(stdout);
  } catch {
    throw new Error(`multichain-cli returned non-JSON: ${stdout.slice(0, 200)}`);
  }
}

/**
 * Run a multichain-cli command without throwing.
 * @returns {{ ok: boolean, data?: any, error?: string }}
 */
function tryRun(args, opts = {}) {
  try {
    return { ok: true, data: run(args, opts) };
  } catch (e) {
    logger.warn(`[multichainCli] ${args[0]} failed: ${e.message}`);
    return { ok: false, error: e.message };
  }
}

/** Deterministic JSON (keys sorted recursively). */
function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  const keys = Object.keys(value).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalize(value[k])).join(',') + '}';
}

function sha256Hex(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input), 'utf8');
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function hashPayload(payload) {
  return sha256Hex(canonicalize(payload));
}

module.exports = {
  run,
  tryRun,
  canonicalize,
  sha256Hex,
  hashPayload
};