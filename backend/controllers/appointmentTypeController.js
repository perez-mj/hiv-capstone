// backend/controllers/appointmentTypeController.js
const AppointmentType = require('../models/AppointmentType');
const AuditLog = require('../models/AuditLog');
const { sendSuccess, sendCreated, sendNotFound, sendBadRequest } = require('../utils/responseHandler');

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
      
      // Log audit
      await AuditLog.log({
        user_id: req.user.id,
        action_type: 'INSERT',
        table_name: 'appointment_types',
        record_id: typeId,
        new_values: newType,
        description: `Created appointment type: ${type_name}`,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });
      
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
      
      // Log audit
      await AuditLog.log({
        user_id: req.user.id,
        action_type: 'UPDATE',
        table_name: 'appointment_types',
        record_id: id,
        old_values: existing,
        new_values: updatedType,
        description: `Updated appointment type: ${updatedType.type_name}`,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });
      
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
      
      // Log audit
      await AuditLog.log({
        user_id: req.user.id,
        action_type: 'DELETE',
        table_name: 'appointment_types',
        record_id: id,
        old_values: existing,
        description: `Deleted appointment type: ${existing.type_name}`,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });
      
      await AppointmentType.delete(id);
      
      return sendSuccess(res, 'Appointment type deleted successfully');
    } catch (error) {
      next(error);
    }
  }
};

module.exports = appointmentTypeController;