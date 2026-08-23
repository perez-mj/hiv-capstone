// frontend/src/services/transactionTypeService.js
import api from '@/plugins/axios'

export default {
  async getTransactionTypes(office = null) {
    try {
      const url = office ? `/transaction-types?office=${office}` : '/transaction-types'
      const response = await api.get(url)
      return response.data
    } catch (error) {
      console.error('Get transaction types error:', error)
      throw error
    }
  },

  async getTransactionType(id) {
    try {
      const response = await api.get(`/transaction-types/${id}`)
      return response.data
    } catch (error) {
      console.error('Get transaction type error:', error)
      throw error
    }
  },

  async createTransactionType(data) {
    try {
      const response = await api.post('/transaction-types', data)
      return response.data
    } catch (error) {
      console.error('Create transaction type error:', error)
      throw error
    }
  },

  async updateTransactionType(id, data) {
    try {
      const response = await api.put(`/transaction-types/${id}`, data)
      return response.data
    } catch (error) {
      console.error('Update transaction type error:', error)
      throw error
    }
  },

  async deleteTransactionType(id) {
    try {
      const response = await api.delete(`/transaction-types/${id}`)
      return response.data
    } catch (error) {
      console.error('Delete transaction type error:', error)
      throw error
    }
  }
}