// backend/controllers/patientController.js
const db = require('../models');
const patientService = require('../services/patientService');

class PatientController {
  async list(req, res) {
    try {
      const { page = 1, limit = 20, search = '' } = req.query;
      const result = await patientService.getPatients({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        actorId: req.user.id,
        req
      });
      res.json(result);
    } catch (error) {
      console.error('Error fetching patients:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async search(req, res) {
    try {
      const { query } = req.params;
      const { limit = 10 } = req.query;
      const patients = await patientService.searchPatients(
        query, parseInt(limit), req.user.id, req
      );
      res.json(patients);
    } catch (error) {
      console.error('Error searching patients:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async create(req, res) {
    try {
      const patient = await patientService.createPatient(req.body, req.user.id, req);
      res.status(201).json(patient);
    } catch (error) {
      console.error('Error creating patient:', error);
      if (error.message.includes('already registered')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async getOne(req, res) {
    try {
      const { id } = req.params;
      if (req.user.role === 'patient') {
        const userPatient = await patientService.getPatientByUserId(req.user.id);
        if (!userPatient || userPatient.id !== parseInt(id)) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }
      const patient = await patientService.getPatientById(
        id,
        [{ model: db.Appointment, as: 'Appointments', limit: 5,
           order: [['appointment_date', 'DESC']] }],
        req.user.id,
        req
      );
      res.json(patient);
    } catch (error) {
      if (error.message === 'Patient not found') {
        return res.status(404).json({ error: error.message });
      }
      console.error('Error fetching patient:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const result = await patientService.updatePatient(
        id, req.body, req.user.id, req.user.role, req
      );
      res.json(result.patient);
    } catch (error) {
      if (error.message === 'Patient not found')
        return res.status(404).json({ error: error.message });
      if (error.message === 'Access denied')
        return res.status(403).json({ error: error.message });
      console.error('Error updating patient:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      const { hard = false } = req.query;
      const result = await patientService.deletePatient(
        id, hard === 'true', req.user.id, req
      );
      res.json(result);
    } catch (error) {
      if (error.message === 'Patient not found')
        return res.status(404).json({ error: error.message });
      console.error('Error deleting patient:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getMyProfile(req, res) {
  try {
    const patient = await patientService.getPatientByUserId(req.user.id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient profile not found' });
    }
    res.json(patient);
  } catch (error) {
    console.error('Error fetching own profile:', error);
    res.status(500).json({ error: error.message });
  }
}

  async getHistory(req, res) {
    try {
      const history = await patientService.getPatientHistory(
        req.params.id, req.user.id, req.user.role, req
      );
      res.json(history);
    } catch (error) {
      if (error.message === 'Access denied')
        return res.status(403).json({ error: error.message });
      console.error('Error fetching patient history:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async regenerateCode(req, res) {
    try {
      const result = await patientService.regeneratePatientCode(
        req.params.id, req.user.id, req
      );
      res.json({
        message: 'Facility code regenerated successfully',
        old_code: result.oldCode,
        new_code: result.newCode
      });
    } catch (error) {
      if (error.message === 'Patient not found')
        return res.status(404).json({ error: error.message });
      console.error('Error regenerating facility code:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async validateCode(req, res) {
    try {
      const { code } = req.params;
      const isValid = patientService.validateCode(code);
      const parsed = isValid ? patientService.parseCode(code) : null;
      res.json({ code, valid: isValid, parsed });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async bulkGenerateCodes(req, res) {
    try {
      const { patients } = req.body;
      if (!patients || !Array.isArray(patients) || patients.length === 0) {
        return res.status(400).json({ error: 'Patients array is required' });
      }
      const generated = await patientService.bulkGenerateCodes(
        patients, req.user.id, req
      );
      res.json({
        message: `Generated ${generated.length} codes`,
        patients: generated
      });
    } catch (error) {
      console.error('Error bulk generating codes:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getStats(req, res) {
    try {
      const stats = await patientService.getPatientStats(req.user.id, req);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching patient stats:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async export(req, res) {
    try {
      const { format = 'json', search = '' } = req.query;
      const patients = await patientService.searchPatients(
        search, 1000, req.user.id, req
      );
      
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