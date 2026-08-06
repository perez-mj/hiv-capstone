// frontend/src/utils/formatters.js

/**
 * Format phone number for display
 * @param {string} phone - Raw phone number
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  }
  
  // Format as +63 XXX XXX XXXX for Philippine numbers
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return `+63 ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 11)}`;
  }
  
  return phone;
};

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @param {string} format - Format style (short, medium, long)
 * @returns {string} Formatted date
 */
export const formatDate = (date, format = 'medium') => {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '';
  
  const options = {
    short: { year: 'numeric', month: 'short', day: 'numeric' },
    medium: { year: 'numeric', month: 'long', day: 'numeric' },
    long: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  };
  
  return d.toLocaleDateString('en-US', options[format] || options.medium);
};

/**
 * Format time for display
 * @param {string} time - Time string (HH:MM:SS or HH:MM)
 * @returns {string} Formatted time
 */
export const formatTime = (time) => {
  if (!time) return '';
  
  const parts = time.split(':');
  if (parts.length < 2) return time;
  
  const hours = parseInt(parts[0]);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  
  return `${hour12}:${minutes} ${ampm}`;
};

/**
 * Format date and time together
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date and time
 */
export const formatDateTime = (date) => {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '';
  
  return `${formatDate(d)} at ${formatTime(d.toTimeString().slice(0, 8))}`;
};

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (PHP, USD, etc.)
 * @returns {string} Formatted currency
 */
export const formatCurrency = (amount, currency = 'PHP') => {
  if (amount === undefined || amount === null) return '';
  
  const formatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return formatter.format(amount);
};

/**
 * Format queue number for display
 * @param {string} queueNumber - Queue number (e.g., T-001)
 * @returns {string} Formatted queue number
 */
export const formatQueueNumber = (queueNumber) => {
  if (!queueNumber) return '---';
  
  // If it's already formatted, return as is
  if (queueNumber.match(/^[TR]-\d{3}$/)) {
    return queueNumber;
  }
  
  // Try to format if it's just a number
  const num = parseInt(queueNumber);
  if (!isNaN(num)) {
    return `T-${String(num).padStart(3, '0')}`;
  }
  
  return queueNumber;
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} length - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, length = 50) => {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
};

/**
 * Capitalize first letter of each word
 * @param {string} text - Text to capitalize
 * @returns {string} Capitalized text
 */
export const capitalizeWords = (text) => {
  if (!text) return '';
  return text.replace(/\b\w/g, char => char.toUpperCase());
};

/**
 * Generate initials from name
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @returns {string} Initials
 */
export const getInitials = (firstName, lastName) => {
  if (!firstName && !lastName) return '';
  const first = firstName ? firstName.charAt(0).toUpperCase() : '';
  const last = lastName ? lastName.charAt(0).toUpperCase() : '';
  return first + last;
};

/**
 * Format duration in minutes to human readable
 * @param {number} minutes - Duration in minutes
 * @returns {string} Human readable duration
 */
export const formatDuration = (minutes) => {
  if (!minutes || minutes === 0) return 'Now';
  
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
};

/**
 * Format bytes to human readable file size
 * @param {number} bytes - Size in bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} Human readable file size
 */
export const formatFileSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Format patient status with color
 * @param {string} status - Patient status
 * @returns {Object} Status with color and label
 */
export const formatPatientStatus = (status) => {
  const statusMap = {
    testing: { label: 'Testing', color: 'primary' },
    treatment: { label: 'Treatment', color: 'success' },
    discharged: { label: 'Discharged', color: 'grey' },
    referred: { label: 'Referred', color: 'warning' }
  };
  
  return statusMap[status] || { label: status || 'Unknown', color: 'grey' };
};

/**
 * Format appointment status with color
 * @param {string} status - Appointment status
 * @returns {Object} Status with color and label
 */
export const formatAppointmentStatus = (status) => {
  const statusMap = {
    pending: { label: 'Pending', color: 'warning' },
    checked_in: { label: 'Checked In', color: 'success' },
    completed: { label: 'Completed', color: 'info' },
    cancelled: { label: 'Cancelled', color: 'error' },
    no_show: { label: 'No Show', color: 'grey' }
  };
  
  return statusMap[status] || { label: status || 'Unknown', color: 'grey' };
};

/**
 * Format queue status with color
 * @param {string} status - Queue status
 * @returns {Object} Status with color and label
 */
export const formatQueueStatus = (status) => {
  const statusMap = {
    waiting: { label: 'Waiting', color: 'info' },
    'in-progress': { label: 'In Progress', color: 'warning' },
    completed: { label: 'Completed', color: 'success' },
    skipped: { label: 'Skipped', color: 'error' },
    'no-show': { label: 'No Show', color: 'grey' }
  };
  
  return statusMap[status] || { label: status || 'Unknown', color: 'grey' };
};

/**
 * Format gender with icon
 * @param {string} gender - Gender
 * @returns {Object} Gender with icon and label
 */
export const formatGender = (gender) => {
  const genderMap = {
    male: { label: 'Male', icon: 'mdi-gender-male' },
    female: { label: 'Female', icon: 'mdi-gender-female' },
    other: { label: 'Other', icon: 'mdi-gender-non-binary' }
  };
  
  return genderMap[gender?.toLowerCase()] || { label: gender || 'Unknown', icon: 'mdi-help' };
};

/**
 * Format HIV test result with color
 * @param {string} result - Test result
 * @returns {Object} Result with color and label
 */
export const formatHIVResult = (result) => {
  const resultMap = {
    positive: { label: 'Positive', color: 'error' },
    negative: { label: 'Negative', color: 'success' },
    indeterminate: { label: 'Indeterminate', color: 'warning' }
  };
  
  return resultMap[result?.toLowerCase()] || { label: result || 'Unknown', color: 'grey' };
};