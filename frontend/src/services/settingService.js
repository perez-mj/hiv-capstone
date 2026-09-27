// frontend/src/services/settingService.js
import api from '@/plugins/axios'

// Match the backend route prefix: /api/system-settings
const BASE = '/admin/settings'

/**
 * Convert a typed JS value into the string representation the backend
 * stores (backend stores everything as TEXT + a data_type tag).
 */
const formatValueForStorage = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

/**
 * Detect data_type from a raw JS value. Mirrors the backend
 * SystemSetting._normalizeValue() logic.
 */
const detectDataType = (value) => {
  if (value === null || value === undefined) return 'string'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'object') return 'json'
  return 'string'
}

/**
 * Parse a stored string value into a typed JS value, based on data_type.
 * Mirrors the model's getTypedValue() instance method.
 */
const parseTypedValue = (rawValue, dataType) => {
  switch (dataType) {
    case 'number':
      return Number(rawValue)
    case 'boolean':
      return rawValue === 'true' || rawValue === true || rawValue === '1'
    case 'json':
      try {
        return JSON.parse(rawValue)
      } catch {
        return rawValue
      }
    default:
      return rawValue
  }
}

/**
 * Build the { key, value, data_type, description, category } shape used
 * by the settings table component.
 */
const buildSetting = (key, value, category = null, description = '') => {
  // Detect data_type from the *typed* value (before stringifying)
  const dataType = detectDataType(value)
  return {
    key,
    value: formatValueForStorage(value),
    typedValue: value,
    data_type: dataType,
    description,
    category
  }
}

/**
 * Normalise the various shapes the backend may return into a flat array
 * of setting objects:
 *   - Array of raw rows            → [ { key, value, data_type, ... } ]
 *   - Flat typed object            → { key: typedValue, ... }
 *   - Categorized typed object     → { category: { key: typedValue } }
 */
const transformSettings = (data) => {
  if (!data) return []

  // Case 1: already an array of raw setting rows (from GET /)
  if (Array.isArray(data)) {
    return data.map((row) => ({
      key: row.key,
      value: row.value,
      typedValue: parseTypedValue(row.value, row.data_type),
      data_type: row.data_type || 'string',
      description: row.description || '',
      category: row.category || null
    }))
  }

  if (typeof data !== 'object') return []

  // Case 2 / 3: object (flat or categorized)
  const result = []
  const isFlat = Object.values(data).every(
    (v) => v === null || typeof v !== 'object'
  )

  if (isFlat) {
    for (const [key, value] of Object.entries(data)) {
      result.push(buildSetting(key, value, null))
    }
  } else {
    for (const [category, settings] of Object.entries(data)) {
      if (!settings || typeof settings !== 'object') continue
      for (const [key, value] of Object.entries(settings)) {
        result.push(buildSetting(key, value, category))
      }
    }
  }

  return result
}

const handleError = (error) => {
  const message =
    error.response?.data?.error ||
    error.response?.data?.message ||
    error.message ||
    'An error occurred'
  return new Error(message)
}

export default {
  /**
   * Fetch all settings as a flat, typed array.
   * Uses GET /categorized so category info is preserved.
   * Falls back to GET / if /categorized is unavailable.
   */
  async getAllSettings() {
    try {
      const { data } = await api.get(`${BASE}/categorized`)
      // Backend wraps responses as { success, data }
      const payload = data?.data ?? data
      return transformSettings(payload)
    } catch (error) {
      // Fallback: try the raw listing endpoint
      try {
        const { data } = await api.get(BASE)
        const payload = data?.data ?? data
        return transformSettings(payload)
      } catch (fallbackError) {
        throw handleError(fallbackError)
      }
    }
  },

  /**
   * Fetch a flat typed object of all settings: { key: typedValue }.
   */
  async getSettingsObject() {
    try {
      const { data } = await api.get(`${BASE}/object`)
      return data?.data ?? data
    } catch (error) {
      throw handleError(error)
    }
  },

  /**
   * Fetch settings for a single category (raw rows).
   */
  async getByCategory(category) {
    try {
      const { data } = await api.get(`${BASE}/category/${encodeURIComponent(category)}`)
      const payload = data?.data ?? data
      return transformSettings(payload)
    } catch (error) {
      throw handleError(error)
    }
  },

  /**
   * Fetch a single setting by key.
   */
  async getByKey(key) {
    try {
      const { data } = await api.get(`${BASE}/key/${encodeURIComponent(key)}`)
      return data?.data ?? data
    } catch (error) {
      throw handleError(error)
    }
  },

  /**
   * Create a new setting.
   */
  async createSetting(setting) {
    try {
      const payload = {
        key: setting.key,
        value: formatValueForStorage(setting.value),
        data_type: setting.data_type || detectDataType(setting.value),
        description: setting.description || null,
        category: setting.category || null
      }
      const { data } = await api.post(BASE, payload)
      return data?.data ?? data
    } catch (error) {
      throw handleError(error)
    }
  },

  /**
   * Update a single setting by key.
   */
  async updateSetting(key, updates) {
    try {
      const payload = {}
      if (updates.value !== undefined) {
        payload.value = formatValueForStorage(updates.value)
        payload.data_type = updates.data_type || detectDataType(updates.value)
      }
      if (updates.description !== undefined) payload.description = updates.description
      if (updates.category !== undefined) payload.category = updates.category

      const { data } = await api.put(
        `${BASE}/key/${encodeURIComponent(key)}`,
        payload
      )
      return data?.data ?? data
    } catch (error) {
      throw handleError(error)
    }
  },

  /**
   * Delete a setting by key.
   */
  async deleteSetting(key) {
    try {
      const { data } = await api.delete(`${BASE}/key/${encodeURIComponent(key)}`)
      return data
    } catch (error) {
      throw handleError(error)
    }
  },

  /**
   * Bulk update multiple settings.
   *
   * Accepts either:
   *   - an array of { key, value, data_type? }
   *   - an object map { key: value, ... }
   *
   * Backend PATCH /bulk expects a flat { key: value } object, so we
   * normalise to that shape before sending.
   */
  async updateMultipleSettings(updates) {
    try {
      /** @type {Record<string, any>} */
      let body = {}

      if (Array.isArray(updates)) {
        for (const item of updates) {
          if (!item || !item.key) continue
          body[item.key] = item.value
        }
      } else if (updates && typeof updates === 'object') {
        body = { ...updates }
      } else {
        throw new Error('updates must be an array or object')
      }

      if (Object.keys(body).length === 0) {
        return { success: true, data: [] }
      }

      const { data } = await api.patch(`${BASE}/bulk`, body)
      return data
    } catch (error) {
      throw handleError(error)
    }
  }
}