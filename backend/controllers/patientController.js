// backend/controllers/patientController.js
const db = require('../models');
const patientService = require('../services/patientService');

class PatientController {
  /**
   * List all patients (paginated)
   * GET /api/patients
   */
  async list(req, res) {
    try {
      const { page = 1, limit = 20, search = '' } = req.query;
      
      const result = await patientService.getPatients({
        page: parseInt(page),
        limit: parseInt(limit),
        search: search
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching patients:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Search patients
   * GET /api/patients/search/:query
   */
  async search(req, res) {
    try {
      const { query } = req.params;
      const { limit = 10 } = req.query;
      
      const patients = await patientService.searchPatients(query, parseInt(limit));
      res.json(patients);
    } catch (error) {
      console.error('Error searching patients:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Create new patient
   * POST /api/patients
   */
  async create(req, res) {
    try {
      const patient = await patientService.createPatient(
        req.body,
        req.user.id
      );
      
      // Log audit
      await db.AuditLog.create({
        user_id: req.user.id,
        action: 'CREATE',
        entity_type: 'Patient',
        entity_id: patient.id,
        new_data: patient.toJSON(),
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });
      
      res.status(201).json(patient);
    } catch (error) {
      console.error('Error creating patient:', error);
      
      if (error.message.includes('already registered')) {
        return res.status(400).json({ error: error.message });
      }
      
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get my patient profile
   * GET /api/patients/me
   */
  async getMyProfile(req, res) {
    try {
      const patient = await patientService.getPatientByUserId(req.user.id);
      
      if (!patient) {
        return res.status(404).json({ error: 'Patient profile not found' });
      }
      
      res.json(patient);
    } catch (error) {
      console.error('Error fetching patient profile:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get single patient details
   * GET /api/patients/:id
   */
  async getOne(req, res) {
    try {
      const { id } = req.params;
      
      // Check permissions
      if (req.user.role === 'patient') {
        const userPatient = await patientService.getPatientByUserId(req.user.id);
        if (!userPatient || userPatient.id !== parseInt(id)) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }
      
      const patient = await patientService.getPatientById(id, [
        {
          model: db.Appointment,
          as: 'Appointments',
          limit: 5,
          order: [['appointment_date', 'DESC']]
        }
      ]);
      
      res.json(patient);
    } catch (error) {
      console.error('Error fetching patient:', error);
      
      if (error.message === 'Patient not found') {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Update patient
   * PUT /api/patients/:id
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      
      const result = await patientService.updatePatient(
        id,
        req.body,
        req.user.id,
        req.user.role
      );
      
      // Log audit
      await db.AuditLog.create({
        user_id: req.user.id,
        action: 'UPDATE',
        entity_type: 'Patient',
        entity_id: parseInt(id),
        old_data: result.oldData,
        new_data: result.patient.toJSON(),
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });
      
      res.json(result.patient);
    } catch (error) {
      console.error('Error updating patient:', error);
      
      if (error.message === 'Patient not found') {
        return res.status(404).json({ error: error.message });
      }
      
      if (error.message === 'Access denied') {
        return res.status(403).json({ error: error.message });
      }
      
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Delete patient
   * DELETE /api/patients/:id
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      const { hard = false } = req.query;
      
      const result = await patientService.deletePatient(id, hard === 'true');
      
      // Log audit
      await db.AuditLog.create({
        user_id: req.user.id,
        action: 'DELETE',
        entity_type: 'Patient',
        entity_id: parseInt(id),
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error deleting patient:', error);
      
      if (error.message === 'Patient not found') {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get patient history
   * GET /api/patients/:id/history
   */
  async getHistory(req, res) {
    try {
      const { id } = req.params;
      
      const history = await patientService.getPatientHistory(
        id,
        req.user.id,
        req.user.role
      );
      
      res.json(history);
    } catch (error) {
      console.error('Error fetching patient history:', error);
      
      if (error.message === 'Access denied') {
        return res.status(403).json({ error: error.message });
      }
      
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Regenerate facility code
   * POST /api/patients/:id/regenerate-code
   */
  async regenerateCode(req, res) {
    try {
      const { id } = req.params;
      
      const result = await patientService.regeneratePatientCode(id);
      
      // Log audit
      await db.AuditLog.create({
        user_id: req.user.id,
        action: 'UPDATE',
        entity_type: 'Patient',
        entity_id: parseInt(id),
        old_data: { patient_facility_code: result.oldCode },
        new_data: { patient_facility_code: result.newCode },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });
      
      res.json({
        message: 'Facility code regenerated successfully',
        old_code: result.oldCode,
        new_code: result.newCode
      });
    } catch (error) {
      console.error('Error regenerating facility code:', error);
      
      if (error.message === 'Patient not found') {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Validate facility code
   * GET /api/patients/validate-code/:code
   */
  async validateCode(req, res) {
    try {
      const { code } = req.params;
      
      const isValid = patientService.validateCode(code);
      const parsed = isValid ? patientService.parseCode(code) : null;
      
      res.json({
        code,
        valid: isValid,
        parsed: parsed
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Bulk generate codes
   * POST /api/patients/bulk-generate-codes
   */
  async bulkGenerateCodes(req, res) {
    try {
      const { patients } = req.body;
      
      if (!patients || !Array.isArray(patients) || patients.length === 0) {
        return res.status(400).json({ error: 'Patients array is required' });
      }
      
      const generated = await patientService.bulkGenerateCodes(patients);
      
      // Log audit
      await db.AuditLog.create({
        user_id: req.user.id,
        action: 'BULK_GENERATE',
        entity_type: 'Patient',
        new_data: { count: generated.length },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });
      
      res.json({
        message: `Generated ${generated.length} codes`,
        patients: generated
      });
    } catch (error) {
      console.error('Error bulk generating codes:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get patient statistics
   * GET /api/patients/stats
   */
  async getStats(req, res) {
    try {
      const stats = await patientService.getPatientStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching patient stats:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Export patients
   * GET /api/patients/export
   */
  async export(req, res) {
    try {
      const { format = 'json', search = '' } = req.query;
      
      const patients = await patientService.searchPatients(search, 1000);
      
      if (format === 'csv') {
        // Simple CSV export
        const headers = ['ID', 'First Name', 'Last Name', 'Contact', 'Status', 'Code'];
        const rows = patients.map(p => [
          p.id,
          p.first_name,
          p.last_name,
          p.contact_number,
          p.status,
          p.patient_facility_code
        ]);
        
        const csv = [
          headers.join(','),
          ...rows.map(row => row.join(','))
        ].join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=patients.csv');
        return res.send(csv);
      }
      
      // Default JSON export
      res.json(patients);
    } catch (error) {
      console.error('Error exporting patients:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new PatientController();