// frontend/src/api/auth.js
const API_URL = '/api/auth'

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

// For patient login, we need to use patient_facility_code as username
export async function patientLogin(patientId, password) {
  // Use the same login endpoint but with patient_facility_code as username
  const res = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      username: patientId,  // patient_facility_code as username
      password 
    })
  })
  
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Login failed')
  }
  
  return res.json()
}

export async function registerUser(user) {
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