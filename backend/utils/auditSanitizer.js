// backend/utils/auditSanitizer.js

const ALWAYS_REDACT = new Set([
  // Auth
  'password', 'password_hash', 'current_password', 'new_password',
  'confirm_password', 'token', 'refresh_token', 'access_token',
  'jwt', 'otp', 'totp_secret',

  // Crypto internals
  'encryption_key', 'hmac_key',

  // Patient PII
  'first_name', 'middle_name', 'last_name', 'birth_date',
  'contact_number', 'address',
  'emergency_contact', 'emergency_phone',
  'guardian_name', 'guardian_contact',

  // Patient PHI
  'status', 'hiv_status', 'test_result', 'diagnosis',
  'treatment_notes', 'medical_notes',

  // Hash columns
  'first_name_hash', 'middle_name_hash', 'last_name_hash',
  'birth_date_hash', 'gender_hash', 'contact_number_hash',
  'status_hash', 'emergency_phone_hash'
]);

function sanitize(value, depth = 0) {
  if (value === null || value === undefined) return value;
  if (depth > 4) return '[DEPTH_LIMIT]';
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    const cap = 20;
    const slice = value.slice(0, cap).map(v => sanitize(v, depth + 1));
    if (value.length > cap) slice.push(`[...${value.length - cap} more]`);
    return slice;
  }

  if (typeof value === 'object') {
    if (typeof value.toJSON === 'function') value = value.toJSON();
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = ALWAYS_REDACT.has(k) ? '[REDACTED]' : sanitize(v, depth + 1);
    }
    return out;
  }

  if (typeof value === 'string' && value.length > 1000) {
    return value.slice(0, 1000) + '...[TRUNCATED]';
  }
  return value;
}

module.exports = { sanitize, ALWAYS_REDACT };