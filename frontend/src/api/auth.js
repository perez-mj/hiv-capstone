// src/api/auth.js
const API_URL = '/api/auth'  // ✅ Fixed: changed from '/api/users' to '/api/auth'

export async function loginUser(username, password) {
  const res = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Login failed')
  }
  
  return res.json()
}

export async function patientLogin(patient_id, password) {
  const res = await fetch(`${API_URL}/patient/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient_id, password })
  })
  
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Login failed')
  }
  
  return res.json()
}

export async function registerUser(user) {
  // Note: Registration might be handled by admin, not public registration
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  })

  if (!res.ok) throw new Error('Registration failed')
  return res.json()
}

export async function checkAuth() {
  const token = localStorage.getItem('authToken')
  if (!token) return null
  
  const res = await fetch(`${API_URL}/check`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (!res.ok) return null
  return res.json()
}