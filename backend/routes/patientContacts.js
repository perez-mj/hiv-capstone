const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticatePatient = require('../middleware/patientAuth');

router.use(authenticatePatient);

// GET /api/patient/contacts - Get healthcare contacts
router.get('/', async (req, res) => {
  try {
    const patient_id = req.patient.patient_id;
    console.log('\U0001f4c7 Fetching contacts for patient:', patient_id);

    const contacts = [
      {
        id: 1,
        name: 'Healthcare Provider',
        role: 'Medical Team',
        type: 'admin',
        unread_count: 0
      },
      {
        id: 2,
        name: 'Dr. Smith',
        role: 'Primary Physician',
        type: 'admin',
        unread_count: 0
      },
      {
        id: 3,
        name: 'Nurse Johnson',
        role: 'Registered Nurse',
        type: 'admin',
        unread_count: 0
      }
    ];

    // Get unread counts for each contact
    for (let contact of contacts) {
      const [unreadRows] = await pool.execute(
        `SELECT COUNT(*) as unread_count 
         FROM messages 
         WHERE patient_id = ? AND receiver_type = 'patient' AND is_read = 0`,
        [patient_id]
      );
      contact.unread_count = unreadRows[0].unread_count;
    }

    console.log(`\u2705 Found ${contacts.length} contacts for patient ${patient_id}`);

    res.json({ contacts });

  } catch (err) {
    console.error('\u274c Error fetching contacts:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: err.message 
    });
  }
});

module.exports = router;