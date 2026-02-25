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
 * Generate unique appointment number
 */
const generateAppointmentNumber = async (pool) => {
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

module.exports = {
  hashPassword,
  comparePassword,
  generateRandomPassword,
  generatePatientCode,
  generateAppointmentNumber,
  generateQueueNumber,
  formatDate,
  calculateAge,
  paginate,
  buildWhereClause,
  parseCSV,
  maskSensitiveData,
  isValidEmail,
  isValidPhone,
  sleep,
  retryWithBackoff,
  groupBy,
  deepClone,
  getEnv
};