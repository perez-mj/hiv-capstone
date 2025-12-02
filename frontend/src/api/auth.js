// src/api/auth.js
const API_URL = '/api/users'  // ✅ cleaner base URL now

export async function loginUser(email, password) {
  const res = await fetch(`${API_URL}?email=${email}&password=${password}`)
  const data = await res.json()

  if (!data.length) throw new Error('Invalid email or password')

  return data[0]
}

export async function registerUser(user) {
  const existing = await fetch(`${API_URL}?email=${user.email}`)
  const found = await existing.json()

  if (found.length > 0) throw new Error('Email already exists')

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  })

  if (!res.ok) throw new Error('Registration failed')

  return res.json()
}
