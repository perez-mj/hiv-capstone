// frontend/src/utils/dateUtils.js
import { format, parseISO, isValid } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

// Set your clinic's timezone
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
 * Convert local date + time to UTC ISO string
 * @param {string} dateStr - YYYY-MM-DD
 * @param {string} timeStr - HH:mm
 * @returns {string|null}
 */
export function toUTC(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null

  try {
    const dateTimeStr = `${dateStr}T${timeStr}:00`
    const localDate = new Date(dateTimeStr)

    if (!isValid(localDate)) {
      console.error('Invalid date/time:', dateStr, timeStr)
      return null
    }

    const utcDate = fromZonedTime(localDate, CLINIC_TIMEZONE)
    return utcDate.toISOString()
  } catch (err) {
    console.error('Error converting to UTC:', err)
    return null
  }
}

/**
 * Convert stored UTC ISO string to clinic local time
 * @param {string} utcDateStr
 * @param {string} formatStr
 * @returns {string}
 */
export function toLocal(utcDateStr, formatStr = DISPLAY_DATETIME_FORMAT) {
  if (!utcDateStr) return ''

  try {
    const utcDate = parseISO(utcDateStr)

    if (!isValid(utcDate)) {
      console.error('Invalid UTC date:', utcDateStr)
      return utcDateStr
    }

    const zonedDate = toZonedTime(utcDate, CLINIC_TIMEZONE)
    return format(zonedDate, formatStr)
  } catch (err) {
    console.error('Error converting to local:', err)
    return utcDateStr
  }
}

/**
 * Get start/end of day in clinic timezone converted to UTC
 * @param {Date|string} date
 * @param {boolean} isStart
 * @returns {string|null}
 */
export function getDateRangeForAPI(date, isStart = true) {
  try {
    const baseDate = typeof date === 'string' ? new Date(date) : new Date(date)

    if (!isValid(baseDate)) {
      console.error('Invalid date:', date)
      return null
    }

    const zonedDate = toZonedTime(baseDate, CLINIC_TIMEZONE)

    if (isStart) {
      zonedDate.setHours(0, 0, 0, 0)
    } else {
      zonedDate.setHours(23, 59, 59, 999)
    }

    const utcDate = fromZonedTime(zonedDate, CLINIC_TIMEZONE)
    return utcDate.toISOString()
  } catch (err) {
    console.error('Error getting date range:', err)
    return null
  }
}

/**
 * Format date for display in clinic timezone
 * @param {string|Date} date
 * @param {string} formatStr
 * @returns {string}
 */
export function formatDateForDisplay(date, formatStr = DISPLAY_DATE_FORMAT) {
  if (!date) return ''

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date

    if (!isValid(dateObj)) {
      return String(date)
    }

    const zonedDate = toZonedTime(dateObj, CLINIC_TIMEZONE)
    return format(zonedDate, formatStr)
  } catch (err) {
    console.error('Error formatting date:', err)
    return String(date)
  }
}

/**
 * Extract time from UTC datetime for display
 * @param {string} dateTimeStr
 * @returns {string}
 */
export function formatTimeForDisplay(dateTimeStr) {
  return toLocal(dateTimeStr, DISPLAY_TIME_FORMAT)
}

/**
 * Validate date string
 * @param {string} dateStr
 * @returns {boolean}
 */
export function isValidDate(dateStr) {
  if (!dateStr) return false
  try {
    return isValid(new Date(dateStr))
  } catch {
    return false
  }
}

/**
 * Current clinic date
 * @param {string} formatStr
 * @returns {string}
 */
export function getCurrentClinicDate(formatStr = API_DATE_FORMAT) {
  const now = new Date()
  const zonedNow = toZonedTime(now, CLINIC_TIMEZONE)
  return format(zonedNow, formatStr)
}

/**
 * Current clinic time
 * @param {string} formatStr
 * @returns {string}
 */
export function getCurrentClinicTime(formatStr = API_TIME_FORMAT) {
  const now = new Date()
  const zonedNow = toZonedTime(now, CLINIC_TIMEZONE)
  return format(zonedNow, formatStr)
}

/**
 * Parse local datetime string (YYYY-MM-DD HH:mm) to UTC ISO
 * @param {string} localDateTimeStr
 * @returns {string|null}
 */
export function parseLocalToUTC(localDateTimeStr) {
  if (!localDateTimeStr) return null

  try {
    const [date, time] = localDateTimeStr.split(' ')
    return toUTC(date, time)
  } catch (err) {
    console.error('Error parsing local to UTC:', err)
    return null
  }
}