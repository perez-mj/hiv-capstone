import http from './http'

export const adminApi = {
  // Get dashboard statistics
  getStats: () => http.get('/admin/stats'),
  
  // Get admin profile
  getProfile: () => http.get('/admin/profile'),
  
  // Update admin profile
  updateProfile: (data) => http.put('/admin/profile', data),
  
  // Change password
  changePassword: (data) => http.put('/admin/password', data),
  
  // Get system logs
  getLogs: (params) => http.get('/admin/logs', { params }),
  
  // Export data
  exportData: (format) => http.get(`/admin/export?format=${format}`)
}

export default adminApi