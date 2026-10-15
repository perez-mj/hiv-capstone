// frontend/src/utils/helpers.js

/**
 * Normalize a list response from the backend into an array.
 * Handles: bare array, { items }, { data }, { rows }, { results }, { patients }.
 */
export function normalizeList(payload) {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []
  return (
    payload.items ||
    payload.data ||
    payload.rows ||
    payload.results ||
    payload.patients ||
    []
  )
}

/**
 * Normalize a single-object response from the backend.
 * Unwraps { data: {...} } or returns the payload as-is.
 */
export function normalizeOne(payload) {
  if (!payload || typeof payload !== 'object') return payload
  // Only unwrap if `data` is an object/array AND payload looks like an envelope
  if ('data' in payload && (payload.success !== undefined || Object.keys(payload).length <= 2)) {
    return payload.data
  }
  return payload
}