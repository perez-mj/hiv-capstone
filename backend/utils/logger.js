// backend/utils/logger.js
const fs = require('fs');
const path = require('path');

const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();
const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '..', '..', 'logs');
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PROD = NODE_ENV === 'production';

// ---------- Levels ----------
const LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

const COLORS = {
  error: '\x1b[31m',   // red
  warn:  '\x1b[33m',   // yellow
  info:  '\x1b[36m',   // cyan
  http:  '\x1b[35m',   // magenta
  debug: '\x1b[90m',   // gray
  reset: '\x1b[0m'
};

// ---------- Redaction (matches auditSanitizer) ----------
const REDACT_KEYS = new Set([
  'password', 'password_hash', 'current_password', 'new_password',
  'confirm_password', 'token', 'refresh_token', 'access_token',
  'jwt', 'otp', 'totp_secret', 'encryption_key', 'hmac_key',
  'first_name', 'middle_name', 'last_name', 'birth_date',
  'contact_number', 'address', 'emergency_contact', 'emergency_phone',
  'guardian_name', 'guardian_contact',
  'status', 'hiv_status', 'test_result', 'diagnosis',
  'treatment_notes', 'medical_notes',
  'first_name_hash', 'middle_name_hash', 'last_name_hash',
  'birth_date_hash', 'gender_hash', 'contact_number_hash',
  'status_hash', 'emergency_phone_hash',
  'authorization', 'cookie', 'set-cookie'
]);

function redact(value, depth = 0) {
  if (value === null || value === undefined) return value;
  if (depth > 4) return '[DEPTH_LIMIT]';
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map(v => redact(v, depth + 1));
  }
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = REDACT_KEYS.has(k.toLowerCase()) ? '[REDACTED]' : redact(v, depth + 1);
    }
    return out;
  }
  if (typeof value === 'string' && value.length > 2000) {
    return value.slice(0, 2000) + '...[TRUNCATED]';
  }
  return value;
}

// ---------- File streams (prod only) ----------
let fileStream = null;
let errorStream = null;

if (IS_PROD) {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    const today = new Date().toISOString().split('T')[0];
    fileStream = fs.createWriteStream(
      path.join(LOG_DIR, `app-${today}.log`),
      { flags: 'a' }
    );
    errorStream = fs.createWriteStream(
      path.join(LOG_DIR, `error-${today}.log`),
      { flags: 'a' }
    );
  } catch (err) {
    console.error('[logger] failed to open log files:', err.message);
  }
}

// ---------- Formatting ----------
function format(level, message, meta) {
  const ts = new Date().toISOString();
  const levelTag = level.toUpperCase().padEnd(5);

  const metaStr = meta && Object.keys(meta).length
    ? ' ' + safeStringify(redact(meta))
    : '';

  const plain = `[${ts}] [${levelTag}] ${message}${metaStr}`;

  if (IS_PROD) return plain;

  const color = COLORS[level] || '';
  return `${color}${plain}${COLORS.reset}`;
}

function safeStringify(obj) {
  try {
    return JSON.stringify(obj);
  } catch {
    return '[Unserializable]';
  }
}

// ---------- Core write ----------
function write(level, message, meta = {}) {
  try {
    if (LEVELS[level] > LEVELS[LOG_LEVEL]) return;

    const line = format(level, message, meta);

    // Console (dev) or files (prod)
    if (IS_PROD) {
      if (fileStream) fileStream.write(line + '\n');
      if (level === 'error' && errorStream) errorStream.write(line + '\n');
      // Also echo errors to stderr so process managers catch them
      if (level === 'error') process.stderr.write(line + '\n');
    } else {
      if (level === 'error' || level === 'warn') console.error(line);
      else console.log(line);
    }
  } catch (err) {
    // Last-resort fallback — logger must never crash the app
    try {
      console.error('[logger] write failed:', err.message);
    } catch { /* ignore */ }
  }
}

// ---------- Public API ----------
const logger = {
  error: (message, meta) => write('error', message, meta),
  warn:  (message, meta) => write('warn',  message, meta),
  info:  (message, meta) => write('info',  message, meta),
  http:  (message, meta) => write('http',  message, meta),
  debug: (message, meta) => write('debug', message, meta),

  // Child logger — attaches fixed metadata to every call
  child(bindings = {}) {
    return {
      error: (m, meta) => write('error', m, { ...bindings, ...meta }),
      warn:  (m, meta) => write('warn',  m, { ...bindings, ...meta }),
      info:  (m, meta) => write('info',  m, { ...bindings, ...meta }),
      http:  (m, meta) => write('http',  m, { ...bindings, ...meta }),
      debug: (m, meta) => write('debug', m, { ...bindings, ...meta }),
      child: (more) => logger.child({ ...bindings, ...more })
    };
  }
};

module.exports = logger;