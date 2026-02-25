// backend/utils/helpers.js
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * Hash a password
 */
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Compare password with hash
 */
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/**
 * Generate random password
 */
const generateRandomPassword = (length = 12) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  
  return password;
};

/**
 * Generate unique patient facility code
 */
const generatePatientCode = async (pool) => {
  const prefix = 'OMPH';
  const year = new Date().getFullYear().toString().slice(-2);
  
  // Get the latest patient code for this year
  const [rows] = await pool.execute(
    `SELECT patient_facility_code FROM patients 
     WHERE patient_facility_code LIKE ? 
     ORDER BY id DESC LIMIT 1`,
    [`${prefix}${year}%`]
  );
  
  let sequence = 1;
  if (rows.length > 0) {
    const lastCode = rows[0].patient_facility_code;
    const lastSequence = parseInt(lastCode.slice(-6));
    sequence = lastSequence + 1;
  }
  
  return `${prefix}${year}${sequence.toString().padStart(6, '0')}`;
};

/**
 * Generate unique appointment number (VERSION 1 - with APT prefix)
 * Used by: appointments.js - POST / (staff creates appointment)
 */
const generateAppointmentNumberWithPrefix = async (pool) => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const prefix = `APT${year}${month}${day}`;
  
  // Get today's count
  const [rows] = await pool.execute(
    `SELECT COUNT(*) as count FROM appointments 
     WHERE appointment_number LIKE ? AND DATE(created_at) = CURDATE()`,
    [`${prefix}%`]
  );
  
  const sequence = (rows[0].count + 1).toString().padStart(4, '0');
  return `${prefix}${sequence}`;
};

/**
 * Generate unique appointment number (VERSION 2 - with YYMMDD-XXXX format)
 * Used by: appointments.js - POST /patient/me/book (patient self-booking)
 */
const generateAppointmentNumberWithDash = async (pool) => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;
  
  const [lastAppointment] = await pool.execute(
    `SELECT appointment_number FROM appointments 
     WHERE appointment_number LIKE ? 
     ORDER BY id DESC LIMIT 1`,
    [`${datePrefix}%`]
  );

  let sequence = 1;
  if (lastAppointment.length > 0) {
    const lastSeq = parseInt(lastAppointment[0].appointment_number.split('-')[1]);
    sequence = lastSeq + 1;
  }
  
  return `${datePrefix}-${String(sequence).padStart(4, '0')}`;
};

/**
 * Generate appointment number (auto-detects which format to use)
 * This is the main function to use - it will check the table structure
 */
const generateAppointmentNumber = async (pool, format = 'dash') => {
  if (format === 'prefix') {
    return await generateAppointmentNumberWithPrefix(pool);
  } else {
    return await generateAppointmentNumberWithDash(pool);
  }
};

/**
 * Generate queue number for the day
 */
const generateQueueNumber = async (pool) => {
  const [rows] = await pool.execute(
    `SELECT COALESCE(MAX(queue_number), 0) as max_number 
     FROM queue 
     WHERE DATE(created_at) = CURDATE()`
  );
  
  return rows[0].max_number + 1;
};

/**
 * Format date for display
 */
const formatDate = (date, format = 'YYYY-MM-DD') => {
  if (!date) return null;
  
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'YYYY-MM-DD HH:mm:ss':
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    case 'HH:mm:ss':
      return `${hours}:${minutes}:${seconds}`;
    case 'HH:mm':
      return `${hours}:${minutes}`;
    default:
      return `${year}-${month}-${day}`;
  }
};

/**
 * Format date for SQL (YYYY-MM-DD)
 */
const formatDateForSQL = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

/**
 * Calculate age from date of birth
 */
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Paginate results
 */
const paginate = (data, page = 1, limit = 10) => {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  const results = {};
  
  if (endIndex < data.length) {
    results.next = {
      page: page + 1,
      limit: limit
    };
  }
  
  if (startIndex > 0) {
    results.previous = {
      page: page - 1,
      limit: limit
    };
  }
  
  results.data = data.slice(startIndex, endIndex);
  results.total = data.length;
  results.page = page;
  results.limit = limit;
  results.total_pages = Math.ceil(data.length / limit);
  
  return results;
};

/**
 * Build SQL pagination
 */
const buildPagination = (page = 1, limit = 10) => {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const offset = (pageNum - 1) * limitNum;
  
  return {
    page: pageNum,
    limit: limitNum,
    offset
  };
};

/**
 * Build SQL WHERE clause from filters
 */
const buildWhereClause = (filters, allowedFields = []) => {
  const conditions = [];
  const values = [];
  
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      if (allowedFields.includes(key) || allowedFields.length === 0) {
        if (typeof value === 'string' && value.includes('%')) {
          conditions.push(`${key} LIKE ?`);
          values.push(value);
        } else if (Array.isArray(value)) {
          conditions.push(`${key} IN (${value.map(() => '?').join(', ')})`);
          values.push(...value);
        } else {
          conditions.push(`${key} = ?`);
          values.push(value);
        }
      }
    }
  }
  
  return {
    whereClause: conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '',
    values
  };
};

/**
 * Parse CSV string to array
 */
const parseCSV = (csvString, delimiter = ',') => {
  if (!csvString) return [];
  
  const rows = csvString.split('\n');
  const headers = rows[0].split(delimiter).map(h => h.trim());
  
  const result = [];
  
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i].trim()) continue;
    
    const values = rows[i].split(delimiter);
    const obj = {};
    
    headers.forEach((header, index) => {
      obj[header] = values[index]?.trim() || null;
    });
    
    result.push(obj);
  }
  
  return result;
};

/**
 * Mask sensitive data
 */
const maskSensitiveData = (data, fields = ['password', 'password_hash', 'token']) => {
  if (!data) return data;
  
  const masked = { ...data };
  
  const maskField = (obj, field) => {
    if (obj[field] && typeof obj[field] === 'string') {
      const value = obj[field];
      if (value.length > 4) {
        obj[field] = '*'.repeat(value.length - 4) + value.slice(-4);
      } else {
        obj[field] = '****';
      }
    }
  };
  
  fields.forEach(field => {
    if (Array.isArray(masked)) {
      masked.forEach(item => maskField(item, field));
    } else {
      maskField(masked, field);
    }
  });
  
  return masked;
};

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format
 */
const isValidPhone = (phone) => {
  const phoneRegex = /^[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/;
  return phoneRegex.test(phone);
};

/**
 * Sleep for specified milliseconds
 */
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry a function with exponential backoff
 */
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const delay = baseDelay * Math.pow(2, i);
      await sleep(delay);
    }
  }
  
  throw lastError;
};

/**
 * Group array by key
 */
const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const groupKey = item[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
};

/**
 * Deep clone object
 */
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Get environment variable with default
 */
const getEnv = (key, defaultValue = null) => {
  return process.env[key] || defaultValue;
};

/**
 * Parse date range from query
 */
const parseDateRange = (startDate, endDate) => {
  const range = {};
  
  if (startDate) {
    range.start_date = new Date(startDate);
  }
  
  if (endDate) {
    range.end_date = new Date(endDate);
  }
  
  return range;
};

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 */
const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Generate random string
 */
const generateRandomString = (length = 10) => {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
};

/**
 * Extract token from authorization header
 */
const extractToken = (authHeader) => {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }
  
  return null;
};

module.exports = {
  // Password functions
  hashPassword,
  comparePassword,
  generateRandomPassword,
  
  // Code generation functions
  generatePatientCode,
  generateAppointmentNumber, // Main function - uses dash format by default
  generateAppointmentNumberWithPrefix, // For APT prefix format
  generateAppointmentNumberWithDash, // For YYMMDD-XXXX format
  generateQueueNumber,
  generateRandomString,
  
  // Date functions
  formatDate,
  formatDateForSQL,
  calculateAge,
  parseDateRange,
  
  // Pagination functions
  paginate,
  buildPagination,
  
  // Query functions
  buildWhereClause,
  
  // Validation functions
  isValidEmail,
  isValidPhone,
  isEmpty,
  
  // Data functions
  maskSensitiveData,
  deepClone,
  groupBy,
  parseCSV,
  
  // Utility functions
  sleep,
  retryWithBackoff,
  getEnv,
  extractToken
};