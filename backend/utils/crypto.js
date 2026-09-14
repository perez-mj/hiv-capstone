// backend/utils/crypto.js
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;        // GCM standard
const AUTH_TAG_LENGTH = 16;
const ENCODING = 'hex';

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
const HMAC_KEY = Buffer.from(process.env.HMAC_KEY, 'hex');

if (ENCRYPTION_KEY.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex chars)');
}
if (HMAC_KEY.length !== 32) {
  throw new Error('HMAC_KEY must be 32 bytes (64 hex chars)');
}

/**
 * AES-256-GCM encrypt. Returns "iv:authTag:ciphertext" (all hex).
 * Non-deterministic — safe for storage, NOT searchable.
 */
function encrypt(plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === '') return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(String(plaintext), 'utf8', ENCODING);
  encrypted += cipher.final(ENCODING);
  const authTag = cipher.getAuthTag().toString(ENCODING);
  return `${iv.toString(ENCODING)}:${authTag}:${encrypted}`;
}

/**
 * AES-256-GCM decrypt. Input must be "iv:authTag:ciphertext".
 */
function decrypt(ciphertext) {
  if (!ciphertext) return null;
  const parts = String(ciphertext).split(':');
  if (parts.length !== 3) return null; // not encrypted / plaintext fallback
  const [ivHex, authTagHex, encrypted] = parts;
  try {
    const iv = Buffer.from(ivHex, ENCODING);
    const authTag = Buffer.from(authTagHex, ENCODING);
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, ENCODING, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    // Tampered or wrong key
    return null;
  }
}

/**
 * HMAC-SHA256 blind index. Deterministic — safe for equality search.
 * Normalizes input (trim + lowercase) so "Reactive" === "reactive".
 */
function hmac(value) {
  if (value === null || value === undefined || value === '') return null;
  return crypto
    .createHmac('sha256', HMAC_KEY)
    .update(String(value).trim().toLowerCase())
    .digest('hex');
}

module.exports = { encrypt, decrypt, hmac };