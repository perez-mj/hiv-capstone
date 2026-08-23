// backend/controllers/transactionTypeController.js
const { TransactionType, Appointment } = require('../models');

const transactionTypeController = {
  // Get all transaction types
  async getAllTransactionTypes(req, res) {
    try {
      const { office, is_active, include_inactive } = req.query;
      
      const where = {};
      
      // Filter by office if provided
      if (office) {
        where.office = office;
      }
      
      // Filter by active status
      if (is_active !== undefined) {
        where.is_active = is_active === 'true';
      } else if (!include_inactive) {
        // Default: only show active transaction types
        where.is_active = true;
      }
      
      const transactionTypes = await TransactionType.findAll({
        where,
        order: [
          ['office', 'ASC'],
          ['name', 'ASC']
        ],
        attributes: {
          exclude: ['deletedAt'] // Exclude paranoid soft delete field
        }
      });
      
      res.status(200).json({
        success: true,
        data: transactionTypes,
        count: transactionTypes.length
      });
    } catch (error) {
      console.error('Error fetching transaction types:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch transaction types'
      });
    }
  },

  // Get transaction type by ID
  async getTransactionTypeById(req, res) {
    try {
      const { id } = req.params;
      
      const transactionType = await TransactionType.findByPk(id);
      
      if (!transactionType) {
        return res.status(404).json({
          success: false,
          error: 'Transaction type not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: transactionType
      });
    } catch (error) {
      console.error('Error fetching transaction type:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch transaction type'
      });
    }
  },

  // Create a new transaction type
  async createTransactionType(req, res) {
    try {
      const { 
        name, 
        office, 
        estimated_duration_minutes, 
        description, 
        color_code,
        is_active 
      } = req.body;
      
      // Validate required fields
      if (!name || !office || !estimated_duration_minutes) {
        return res.status(400).json({
          success: false,
          error: 'Name, office, and estimated duration are required'
        });
      }
      
      // Validate office enum
      if (!['testing', 'treatment'].includes(office)) {
        return res.status(400).json({
          success: false,
          error: 'Office must be either "testing" or "treatment"'
        });
      }
      
      // Validate estimated duration
      if (estimated_duration_minutes < 5 || estimated_duration_minutes > 120) {
        return res.status(400).json({
          success: false,
          error: 'Estimated duration must be between 5 and 120 minutes'
        });
      }
      
      // Check if transaction type with same name already exists
      const existingType = await TransactionType.findOne({
        where: { name }
      });
      
      if (existingType) {
        return res.status(409).json({
          success: false,
          error: 'Transaction type with this name already exists'
        });
      }
      
      // Create transaction type
      const transactionType = await TransactionType.create({
        name,
        office,
        estimated_duration_minutes,
        description: description || null,
        color_code: color_code || null,
        is_active: is_active !== undefined ? is_active : true
      });
      
      res.status(201).json({
        success: true,
        data: transactionType,
        message: 'Transaction type created successfully'
      });
    } catch (error) {
      console.error('Error creating transaction type:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create transaction type'
      });
    }
  },

  // Update a transaction type
  async updateTransactionType(req, res) {
    try {
      const { id } = req.params;
      const { 
        name, 
        office, 
        estimated_duration_minutes, 
        description, 
        color_code,
        is_active 
      } = req.body;
      
      // Find transaction type
      const transactionType = await TransactionType.findByPk(id);
      
      if (!transactionType) {
        return res.status(404).json({
          success: false,
          error: 'Transaction type not found'
        });
      }
      
      // Validate office enum if provided
      if (office && !['testing', 'treatment'].includes(office)) {
        return res.status(400).json({
          success: false,
          error: 'Office must be either "testing" or "treatment"'
        });
      }
      
      // Validate estimated duration if provided
      if (estimated_duration_minutes !== undefined && 
          (estimated_duration_minutes < 5 || estimated_duration_minutes > 120)) {
        return res.status(400).json({
          success: false,
          error: 'Estimated duration must be between 5 and 120 minutes'
        });
      }
      
      // Check if name already exists (if changing name)
      if (name && name !== transactionType.name) {
        const existingType = await TransactionType.findOne({
          where: { name }
        });
        
        if (existingType) {
          return res.status(409).json({
            success: false,
            error: 'Transaction type with this name already exists'
          });
        }
      }
      
      // Update transaction type
      await transactionType.update({
        name: name || transactionType.name,
        office: office || transactionType.office,
        estimated_duration_minutes: estimated_duration_minutes || transactionType.estimated_duration_minutes,
        description: description !== undefined ? description : transactionType.description,
        color_code: color_code !== undefined ? color_code : transactionType.color_code,
        is_active: is_active !== undefined ? is_active : transactionType.is_active,
        updated_at: new Date()
      });
      
      // Reload fresh data
      await transactionType.reload();
      
      res.status(200).json({
        success: true,
        data: transactionType,
        message: 'Transaction type updated successfully'
      });
    } catch (error) {
      console.error('Error updating transaction type:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update transaction type'
      });
    }
  },

  // Toggle transaction type active status
  async toggleTransactionTypeActive(req, res) {
    try {
      const { id } = req.params;
      
      const transactionType = await TransactionType.findByPk(id);
      
      if (!transactionType) {
        return res.status(404).json({
          success: false,
          error: 'Transaction type not found'
        });
      }
      
      // Check if there are active appointments using this transaction type
      if (transactionType.is_active) {
        const activeAppointments = await Appointment.count({
          where: {
            transaction_type_id: id,
            status: ['pending', 'checked-in']
          }
        });
        
        if (activeAppointments > 0) {
          return res.status(400).json({
            success: false,
            error: 'Cannot deactivate transaction type with active appointments'
          });
        }
      }
      
      await transactionType.update({
        is_active: !transactionType.is_active,
        updated_at: new Date()
      });
      
      await transactionType.reload();
      
      res.status(200).json({
        success: true,
        data: transactionType,
        message: `Transaction type ${transactionType.is_active ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      console.error('Error toggling transaction type:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to toggle transaction type status'
      });
    }
  },

  // Delete a transaction type (soft delete)
  async deleteTransactionType(req, res) {
    try {
      const { id } = req.params;
      
      const transactionType = await TransactionType.findByPk(id);
      
      if (!transactionType) {
        return res.status(404).json({
          success: false,
          error: 'Transaction type not found'
        });
      }
      
      // Check if there are any appointments using this transaction type
      const appointmentCount = await Appointment.count({
        where: { transaction_type_id: id }
      });
      
      if (appointmentCount > 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot delete transaction type with ${appointmentCount} existing appointments. Deactivate it instead.`
        });
      }
      
      // Soft delete
      await transactionType.destroy();
      
      res.status(200).json({
        success: true,
        message: 'Transaction type deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting transaction type:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete transaction type'
      });
    }
  }
};

module.exports = transactionTypeController;