// frontend/src/services/transactionTypeService.js
import api from '@/plugins/axios'
import { normalizeList, normalizeOne } from '@/utils/helpers'

export default {
  // ─────────────────────────────────────────────
  // Read
  // ─────────────────────────────────────────────
  async getTransactionTypes(office = null, params = {}) {
    try {
      const query = { ...params }
      if (office) query.office = office
      const response = await api.get('/transaction-types', { params: query })
      // Backend: { success: true, items: [...], total, page, totalPages }
      return normalizeList(response.data)
    } catch (error) {
      console.error('Get transaction types error:', error)
      throw error
    }
  },

  async getAll(params = {}) {
    return this.getTransactionTypes(null, params)
  },

  async getTransactionType(id) {
    try {
      const response = await api.get(`/transaction-types/${id}`)
      return normalizeOne(response.data)
    } catch (error) {
      console.error('Get transaction type error:', error)
      throw error
    }
  },

  // ─────────────────────────────────────────────
  // Write
  // ─────────────────────────────────────────────
  async createTransactionType(data) {
    try {
      const response = await api.post('/transaction-types', data)
      return normalizeOne(response.data)
    } catch (error) {
      console.error('Create transaction type error:', error)
      throw error
    }
  },
  async create(data) { return this.createTransactionType(data) },

  async updateTransactionType(id, data) {
    try {
      const response = await api.put(`/transaction-types/${id}`, data)
      return normalizeOne(response.data)
    } catch (error) {
      console.error('Update transaction type error:', error)
      throw error
    }
  },
  async update(id, data) { return this.updateTransactionType(id, data) },

  async toggleTransactionTypeActive(id) {
    try {
      const response = await api.patch(`/transaction-types/${id}/toggle-active`)
      return normalizeOne(response.data)
    } catch (error) {
      console.error('Toggle transaction type error:', error)
      throw error
    }
  },
  async toggleActive(id) { return this.toggleTransactionTypeActive(id) },

  async deleteTransactionType(id) {
    try {
      const response = await api.delete(`/transaction-types/${id}`)
      return response.data
    } catch (error) {
      console.error('Delete transaction type error:', error)
      throw error
    }
  },
  async delete(id) { return this.deleteTransactionType(id) },
}