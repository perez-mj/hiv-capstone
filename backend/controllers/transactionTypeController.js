// backend/controllers/transactionTypeController.js
const transactionTypeService = require('../services/transactionTypeService');

// Small helper to unify error responses
function handleError(res, error, fallbackMessage) {
  const status = error.status || 500;
  if (status >= 500) console.error(fallbackMessage, error);
  return res.status(status).json({
    success: false,
    error: error.message || fallbackMessage
  });
}

const transactionTypeController = {
  async getAllTransactionTypes(req, res) {
    try {
      const { office, is_active, include_inactive } = req.query;
      const result = await transactionTypeService.getAll({
        office,
        is_active,
        include_inactive
      });
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      handleError(res, error, 'Failed to fetch transaction types');
    }
  },

  async getTransactionTypeById(req, res) {
    try {
      const data = await transactionTypeService.getById(req.params.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      handleError(res, error, 'Failed to fetch transaction type');
    }
  },

  async createTransactionType(req, res) {
    try {
      const data = await transactionTypeService.create(req.body);
      res.status(201).json({
        success: true,
        data,
        message: 'Transaction type created successfully'
      });
    } catch (error) {
      handleError(res, error, 'Failed to create transaction type');
    }
  },

  async updateTransactionType(req, res) {
    try {
      const data = await transactionTypeService.update(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data,
        message: 'Transaction type updated successfully'
      });
    } catch (error) {
      handleError(res, error, 'Failed to update transaction type');
    }
  },

  async toggleTransactionTypeActive(req, res) {
    try {
      const data = await transactionTypeService.toggleActive(req.params.id);
      res.status(200).json({
        success: true,
        data,
        message: `Transaction type ${data.is_active ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      handleError(res, error, 'Failed to toggle transaction type status');
    }
  },

  async deleteTransactionType(req, res) {
    try {
      await transactionTypeService.delete(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Transaction type deleted successfully'
      });
    } catch (error) {
      handleError(res, error, 'Failed to delete transaction type');
    }
  },
};

module.exports = transactionTypeController;