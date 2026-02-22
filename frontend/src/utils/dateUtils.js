// frontend/src/utils/dateUtils.js
import { format, parseISO, isValid } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

// Clinic timezone
export const CLINIC_TIMEZONE = 'Asia/Manila'

// Display formats
export const DISPLAY_DATE_FORMAT = 'MMM d, yyyy'
export const DISPLAY_TIME_FORMAT = 'hh:mm a'
export const DISPLAY_DATETIME_FORMAT = 'MMM d, yyyy hh:mm a'

// API formats
export const API_DATE_FORMAT = 'yyyy-MM-dd'
export const API_TIME_FORMAT = 'HH:mm'
export const API_DATETIME_FORMAT = "yyyy-MM-dd'T'HH:mm:ssXXX"

/**
 * Convert local Manila date + time → UTC ISO
 * @param {string} dateStr - YYYY-MM-DD
 * @param {string} timeStr - HH:mm
 * @returns {string|null}
 */
export function toUTC(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null

  try {
    // Split date and time
    const [year, month, day] = dateStr.split('-').map(Number)
    const [hours, minutes] = timeStr.split(':').map(Number)
    
    // Create a date object in the local timezone (browser timezone)
    // This will be interpreted in the browser's local timezone
    const localDate = new Date(year, month - 1, day, hours, minutes, 0)
    
    // Check if valid
    if (isNaN(localDate.getTime())) {
      console.error('Invalid date/time:', dateStr, timeStr)
      return null
    }
    
    // Convert from Manila timezone to UTC
    const utcDate = fromZonedTime(localDate, CLINIC_TIMEZONE)
    return utcDate.toISOString()
  } catch (err) {
    console.error('Error converting to UTC:', err)
    return null
  }
}

/**
 * Convert UTC ISO → Manila formatted string
 */
export function toLocal(utcDateStr, formatStr = DISPLAY_DATETIME_FORMAT) {
  if (!utcDateStr) return ''

  try {
    const utcDate = parseISO(utcDateStr)

    if (!isValid(utcDate)) return utcDateStr

    const zonedDate = toZonedTime(utcDate, CLINIC_TIMEZONE)
    return format(zonedDate, formatStr)
  } catch (err) {
    console.error('Error converting to local:', err)
    return utcDateStr
  }
}

/**
 * Extract formatted time from UTC ISO string
 * @param {string} dateTimeStr
 * @returns {string}
 */
export function formatTimeForDisplay(dateTimeStr) {
  return toLocal(dateTimeStr, DISPLAY_TIME_FORMAT)
}

/**
 * Get Manila start/end of day → UTC ISO for API filtering
 */
export function getDateRangeForAPI(date, isStart = true) {
  try {
    const base = typeof date === 'string' ? new Date(date) : new Date(date)

    if (!isValid(base)) return null

    const zoned = toZonedTime(base, CLINIC_TIMEZONE)

    if (isStart) {
      zoned.setHours(0, 0, 0, 0)
    } else {
      zoned.setHours(23, 59, 59, 999)
    }

    const utcDate = fromZonedTime(zoned, CLINIC_TIMEZONE)
    return utcDate.toISOString()
  } catch (err) {
    console.error('Error getting date range:', err)
    return null
  }
}

/**
 * Format date for display
 */
export function formatDateForDisplay(date, formatStr = DISPLAY_DATE_FORMAT) {
  if (!date) return ''

  try {
    const dateObj =
      typeof date === 'string' ? parseISO(date) : date

    if (!isValid(dateObj)) return String(date)

    const zoned = toZonedTime(dateObj, CLINIC_TIMEZONE)
    return format(zoned, formatStr)
  } catch {
    return String(date)
  }
}

/**
 * Get current Manila date (YYYY-MM-DD)
 */
export function getCurrentClinicDate() {
  const now = new Date()
  const zoned = toZonedTime(now, CLINIC_TIMEZONE)
  return format(zoned, API_DATE_FORMAT)
}

/**
 * Convert UTC ISO → Manila date string (YYYY-MM-DD)
 */
export function utcToLocalDateString(utcDateStr) {
  if (!utcDateStr) return ''

  try {
    const utcDate = parseISO(utcDateStr)
    if (!isValid(utcDate)) return ''

    const zoned = toZonedTime(utcDate, CLINIC_TIMEZONE)
    return format(zoned, API_DATE_FORMAT)
  } catch {
    return ''
  }
}

/**
 * Convert UTC ISO → Manila time string (HH:mm)
 */
export function utcToLocalTimeString(utcDateStr) {
  if (!utcDateStr) return ''

  try {
    const utcDate = parseISO(utcDateStr)
    if (!isValid(utcDate)) return ''

    const zoned = toZonedTime(utcDate, CLINIC_TIMEZONE)
    return format(zoned, API_TIME_FORMAT)
  } catch {
    return ''
  }
}

/**
 * Convert 24h → 12h
 */
export function convertTo12Hour(timeStr) {
  if (!timeStr) return ''

  try {
    const [hours, minutes] = timeStr.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
  } catch {
    return timeStr
  }
}