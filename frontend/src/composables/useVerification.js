// frontend/src/composables/useVerification.js
import { ref, reactive } from 'vue'
import http from '@/api/http'

export function useVerification() {
  const loading = ref(false)
  const verificationResult = ref(null)
  const verificationHistory = ref([])
  const dashboardSummary = ref(null)
  
  /**
   * Verify a single patient
   */
  async function verifyPatient(patientId, options = {}) {
    loading.value = true
    
    try {
      const params = new URLSearchParams()
      if (options.noCache) params.append('no_cache', 'true')
      
      const url = `/verification/patients/${patientId}${params.toString() ? '?' + params.toString() : ''}`
      const response = await http.get(url)
      
      verificationResult.value = response.data
      return response.data
    } catch (error) {
      console.error('Verification failed:', error)
      throw error
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Verify all patients (batch)
   */
  async function verifyAllPatients(options = {}) {
    loading.value = true
    
    try {
      const params = new URLSearchParams()
      if (options.limit) params.append('limit', options.limit)
      if (options.offset) params.append('offset', options.offset)
      if (options.onlySuspicious) params.append('only_suspicious', 'true')
      
      const response = await http.get(`/verification/patients/all?${params.toString()}`)
      return response.data
    } catch (error) {
      console.error('Batch verification failed:', error)
      throw error
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Get verification history for a patient
   */
  async function getVerificationHistory(patientId, limit = 20) {
    loading.value = true
    
    try {
      const response = await http.get(`/verification/patients/${patientId}/history`, {
        params: { limit }
      })
      
      verificationHistory.value = response.data.history
      return response.data
    } catch (error) {
      console.error('Failed to get verification history:', error)
      throw error
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Store current patient snapshot to blockchain
   */
  async function storePatientSnapshot(patientId) {
    loading.value = true
    
    try {
      const response = await http.post(`/verification/patients/${patientId}/snapshot`)
      return response.data
    } catch (error) {
      console.error('Failed to store snapshot:', error)
      throw error
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Restore patient data from blockchain
   */
  async function restoreFromBlockchain(patientId, recordTxid = null, confirm = false) {
    loading.value = true
    
    try {
      const response = await http.post(`/verification/patients/${patientId}/restore`, {
        record_txid: recordTxid,
        confirm
      })
      return response.data
    } catch (error) {
      console.error('Restore failed:', error)
      throw error
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Get verification dashboard summary
   */
  async function getVerificationDashboard() {
    loading.value = true
    
    try {
      const response = await http.get('/verification/dashboard')
      dashboardSummary.value = response.data
      return response.data
    } catch (error) {
      console.error('Failed to get dashboard summary:', error)
      throw error
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Format severity for display
   */
  function getSeverityColor(severity) {
    const colors = {
      critical: 'error',
      high: 'error',
      medium: 'warning',
      low: 'info',
      warning: 'warning',
      error: 'error'
    }
    return colors[severity] || 'grey'
  }
  
  /**
   * Format integrity status
   */
  function getIntegrityStatus(verified) {
    if (verified === true) return { text: 'Verified', color: 'success', icon: 'mdi-shield-check' }
    if (verified === false) return { text: 'Tampered', color: 'error', icon: 'mdi-shield-alert' }
    return { text: 'Unknown', color: 'grey', icon: 'mdi-help-circle' }
  }
  
  return {
    loading,
    verificationResult,
    verificationHistory,
    dashboardSummary,
    verifyPatient,
    verifyAllPatients,
    getVerificationHistory,
    storePatientSnapshot,
    restoreFromBlockchain,
    getVerificationDashboard,
    getSeverityColor,
    getIntegrityStatus
  }
}