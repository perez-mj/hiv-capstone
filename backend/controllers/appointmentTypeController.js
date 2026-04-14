// backend/controllers/appointmentTypeController.js
const AppointmentType = require('../models/AppointmentType');
const { sendSuccess, sendCreated, sendNotFound, sendBadRequest } = require('../utils/responseHandler');
const blockchainAuditService = require('../services/blockchainAuditService');

const appointmentTypeController = {
  // Get all appointment types
  async getAllTypes(req, res, next) {
    try {
      const types = await AppointmentType.findAll(true);
      return sendSuccess(res, 'Appointment types retrieved successfully', types);
    } catch (error) {
      next(error);
    }
  },
  
  // Create appointment type
  async createType(req, res, next) {
    try {
      const { type_name, description, duration_minutes } = req.body;
      
      // Check if type already exists
      const existing = await AppointmentType.findByName(type_name);
      if (existing) {
        return sendBadRequest(res, 'Appointment type already exists');
      }
      
      const typeId = await AppointmentType.create({
        type_name,
        description,
        duration_minutes
      });
      
      const newType = await AppointmentType.findById(typeId);
      
      // Blockchain audit logging (non-blocking)
      blockchainAuditService.logAction(
        'CREATE',
        'appointment_types',
        typeId,
        null, // No patient_id for appointment types
        null,
        newType,
        `Created appointment type: ${type_name} (Duration: ${duration_minutes || 30} mins)`,
        req
      ).catch(err => console.error('Blockchain audit log failed:', err));
      
      return sendCreated(res, 'Appointment type created successfully', newType);
    } catch (error) {
      next(error);
    }
  },
  
  // Update appointment type
  async updateType(req, res, next) {
    try {
      const { id } = req.params;
      
      const existing = await AppointmentType.findById(id);
      if (!existing) {
        return sendNotFound(res, 'Appointment type not found');
      }
      
      const { type_name, description, duration_minutes, is_active } = req.body;
      
      // Check if new type name conflicts
      if (type_name && type_name !== existing.type_name) {
        const conflict = await AppointmentType.findByName(type_name);
        if (conflict && conflict.id !== parseInt(id)) {
          return sendBadRequest(res, 'Appointment type name already exists');
        }
      }
      
      const updated = await AppointmentType.update(id, {
        type_name,
        description,
        duration_minutes,
        is_active
      });
      
      if (!updated) {
        return sendBadRequest(res, 'No changes made');
      }
      
      const updatedType = await AppointmentType.findById(id);
      
      // Track changes for blockchain
      const changedFields = {};
      if (type_name !== undefined && type_name !== existing.type_name) {
        changedFields.type_name = { old: existing.type_name, new: type_name };
      }
      if (description !== undefined && description !== existing.description) {
        changedFields.description = { old: existing.description, new: description };
      }
      if (duration_minutes !== undefined && duration_minutes !== existing.duration_minutes) {
        changedFields.duration_minutes = { old: existing.duration_minutes, new: duration_minutes };
      }
      if (is_active !== undefined && is_active !== existing.is_active) {
        changedFields.is_active = { old: existing.is_active, new: is_active };
      }
      
      // Blockchain audit logging (non-blocking)
      blockchainAuditService.logAction(
        'UPDATE',
        'appointment_types',
        id,
        null,
        existing,
        updatedType,
        `Updated appointment type: ${updatedType.type_name} - Changes: ${Object.keys(changedFields).join(', ')}`,
        req
      ).catch(err => console.error('Blockchain audit log failed:', err));
      
      return sendSuccess(res, 'Appointment type updated successfully', updatedType);
    } catch (error) {
      next(error);
    }
  },
  
  // Delete appointment type
  async deleteType(req, res, next) {
    try {
      const { id } = req.params;
      
      const existing = await AppointmentType.findById(id);
      if (!existing) {
        return sendNotFound(res, 'Appointment type not found');
      }
      
      // Check if type is in use
      const isInUse = await AppointmentType.isInUse(id);
      if (isInUse) {
        return sendBadRequest(res, 'Cannot delete appointment type that is in use');
      }
      
      // Blockchain audit logging (non-blocking)
      blockchainAuditService.logAction(
        'DELETE',
        'appointment_types',
        id,
        null,
        existing,
        null,
        `Deleted appointment type: ${existing.type_name} (ID: ${id})`,
        req
      ).catch(err => console.error('Blockchain audit log failed:', err));
      
      await AppointmentType.delete(id);
      
      return sendSuccess(res, 'Appointment type deleted successfully');
    } catch (error) {
      next(error);
    }
  }
};

module.exports = appointmentTypeController;