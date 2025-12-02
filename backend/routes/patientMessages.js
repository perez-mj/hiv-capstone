// backend/routes/patientMessages.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticatePatient = require('../middleware/patientAuth'); // Fixed import path

// Apply middleware to all routes in this file
router.use(authenticatePatient);

// GET /api/patient/messages - Get patient's messages
router.get('/', async (req, res) => {
  try {
    const patient_id = req.patient.patient_id;
    console.log('📨 Fetching messages for patient:', patient_id);
    
    const { page = 1, limit = 10, unread } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        m.id,
        m.sender_type,
        m.sender_id,
        m.receiver_type,
        m.receiver_id,
        m.patient_id,
        m.subject,
        m.content,
        m.is_read,
        m.created_at,
        CASE 
          WHEN m.sender_type = 'admin' THEN 'Healthcare Provider'
          ELSE 'You'
        END as sender_name
      FROM messages m
      WHERE m.patient_id = ?
    `;
    
    const params = [patient_id];

    if (unread === 'true') {
      query += ' AND m.is_read = 0';
    }

    query += ` ORDER BY m.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

    console.log('📊 Executing messages query:', query);
    console.log('📋 With params:', params);

    const [rows] = await pool.execute(query, params);

    // Get total count and unread count
    const [countRows] = await pool.execute(
      'SELECT COUNT(*) as total FROM messages WHERE patient_id = ?',
      [patient_id]
    );

    const [unreadRows] = await pool.execute(
      'SELECT COUNT(*) as unread_count FROM messages WHERE patient_id = ? AND is_read = 0',
      [patient_id]
    );

    console.log(`✅ Found ${rows.length} messages for patient ${patient_id}`);

    res.json({
      messages: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countRows[0].total,
        pages: Math.ceil(countRows[0].total / limit)
      },
      unread_count: unreadRows[0].unread_count
    });

  } catch (err) {
    console.error('❌ Error fetching patient messages:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: err.message 
    });
  }
});

// POST /api/patient/messages - Send message
router.post('/', async (req, res) => {
  try {
    const patient_id = req.patient.patient_id;
    const { content, subject = 'Message from Patient' } = req.body;

    console.log('📤 Sending message from patient:', patient_id, { content, subject });

    if (!content) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const [result] = await pool.execute(
      `INSERT INTO messages 
       (sender_type, sender_id, receiver_type, receiver_id, patient_id, subject, content, is_read) 
       VALUES ('patient', ?, 'admin', 1, ?, ?, ?, 0)`,
      [patient_id, patient_id, subject, content]
    );

    console.log('✅ Message sent successfully with ID:', result.insertId);

    res.status(201).json({
      message: 'Message sent successfully',
      messageData: {  // Changed from 'message' to avoid conflict
        id: result.insertId,
        sender_type: 'patient',
        sender_id: patient_id,
        receiver_type: 'admin',
        receiver_id: 1,
        patient_id,
        subject,
        content,
        is_read: 0,
        created_at: new Date()
      }
    });

  } catch (err) {
    console.error('❌ Error sending message:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: err.message 
    });
  }
});

// PUT /api/patient/messages/:id/read - Mark message as read
router.put('/:id/read', async (req, res) => {
  try {
    const patient_id = req.patient.patient_id;
    const { id } = req.params;

    console.log(`📖 Marking message ${id} as read for patient ${patient_id}`);

    const [result] = await pool.execute(
      'UPDATE messages SET is_read = 1 WHERE id = ? AND patient_id = ?',
      [id, patient_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    console.log('✅ Message marked as read');

    res.json({ message: 'Message marked as read' });

  } catch (err) {
    console.error('❌ Error marking message as read:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: err.message 
    });
  }
});

// GET /api/patient/contacts - Get healthcare contacts
router.get('/contacts', async (req, res) => {
  try {
    const patient_id = req.patient.patient_id;
    console.log('📇 Fetching contacts for patient:', patient_id);

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

    console.log(`✅ Found ${contacts.length} contacts for patient ${patient_id}`);

    res.json({ contacts });

  } catch (err) {
    console.error('❌ Error fetching contacts:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: err.message 
    });
  }
});

module.exports = router;