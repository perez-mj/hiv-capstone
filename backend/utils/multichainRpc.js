const crypto = require('crypto');
const blockchainConfig = require('../config/blockchain');
const logger = require('./logger');

const RPC_URL =
  `http://${blockchainConfig.host}:${blockchainConfig.rpcPort}/`;

const USER = blockchainConfig.user;
const PASSWORD = blockchainConfig.password;

const TIMEOUT_MS = parseInt(
  process.env.MULTICHAIN_RPC_TIMEOUT_MS || '15000',
  10
);

async function run(args, opts = {}) {
  const [method, ...params] = args;

  const body = {
    jsonrpc: '1.0',
    id: Date.now(),
    method,
    params
  };

  const auth = Buffer
    .from(`${USER}:${PASSWORD}`)
    .toString('base64');

  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, TIMEOUT_MS);

  let res;

  try {
    res = await fetch(RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new Error(
        `multichain-rpc timeout after ${TIMEOUT_MS}ms`
      );
    }

    throw new Error(
      `multichain-rpc fetch error: ${e.message}`
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();

  if (!res.ok) {
    throw new Error(
      `multichain-rpc HTTP ${res.status}: ${text.slice(0, 200)}`
    );
  }

  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      `multichain-rpc returned non-JSON: ${text.slice(0, 200)}`
    );
  }

  if (parsed.error) {
    const msg =
      parsed.error.message ||
      JSON.stringify(parsed.error);

    throw new Error(
      `multichain-rpc ${method} failed: ${msg}`
    );
  }

  return parsed.result;
}

async function tryRun(args, opts = {}) {
  try {
    return {
      ok: true,
      data: await run(args, opts)
    };
  } catch (e) {
    logger.warn(
      `[multichainRpc] ${args[0]} failed: ${e.message}`
    );

    return {
      ok: false,
      error: e.message
    };
  }
}

function canonicalize(value) {
  if (
    value === null ||
    typeof value !== 'object'
  ) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return '[' +
      value.map(canonicalize).join(',') +
      ']';
  }

  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }

  const keys = Object.keys(value).sort();

  return '{' +
    keys
      .map(
        k =>
          JSON.stringify(k) +
          ':' +
          canonicalize(value[k])
      )
      .join(',') +
    '}';
}

function sha256Hex(input) {
  const buf = Buffer.isBuffer(input)
    ? input
    : Buffer.from(String(input), 'utf8');

  return crypto
    .createHash('sha256')
    .update(buf)
    .digest('hex');
}

function hashPayload(payload) {
  return sha256Hex(
    canonicalize(payload)
  );
}

module.exports = {
  run,
  tryRun,
  canonicalize,
  sha256Hex,
  hashPayload
};