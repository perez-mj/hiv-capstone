// backend/routes/adminAppointments.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

router.use(auth);

const getUserInfo = (req) => {
  return {
    admin_user_id: req.user?.id || null,
    ip_address: req.ip || req.connection.remoteAddress || null
  };
};

// GET /api/admin/messaging/conversations - Get all conversations
router.get('/conversations', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT
        m.patient_id,
        p.name as patient_name,
        p.contact_info,
        MAX(m.created_at) as last_message_time,
        COUNT(CASE WHEN m.is_read = 0 AND m.sender_type = 'patient' THEN 1 END) as unread_count,
        (
          SELECT content 
          FROM messages m2 
          WHERE m2.patient_id = m.patient_id 
          ORDER BY m2.created_at DESC 
          LIMIT 1
        ) as last_message
      FROM messages m
      JOIN patients p ON m.patient_id = p.patient_id
      GROUP BY m.patient_id, p.name, p.contact_info
      ORDER BY last_message_time DESC
    `;

    const [rows] = await pool.execute(query);

    const conversations = rows.map(row => ({
      id: row.patient_id, // Using patient_id as conversation ID
      patient_id: row.patient_id,
      name: row.patient_name,
      type: 'patient',
      role: 'Patient',
      last_message_time: row.last_message_time,
      last_message: row.last_message,
      unread_count: row.unread_count,
      contact_info: row.contact_info
    }));

    res.json({ conversations });

  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// GET /api/admin/messaging/conversations/:patient_id/messages - Get messages for a conversation
router.get('/conversations/:patient_id/messages', async (req, res) => {
  try {
    const { patient_id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Verify patient exists
    const [patientRows] = await pool.execute(
      'SELECT name FROM patients WHERE patient_id = ?',
      [patient_id]
    );

    if (patientRows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const query = `
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
          WHEN m.sender_type = 'admin' THEN 'You'
          ELSE p.name
        END as sender_name
      FROM messages m
      LEFT JOIN patients p ON m.patient_id = p.patient_id AND m.sender_type = 'patient'
      WHERE m.patient_id = ?
      ORDER BY m.created_at ASC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.execute(query, [patient_id, parseInt(limit), parseInt(offset)]);

    // Get total count
    const [countRows] = await pool.execute(
      'SELECT COUNT(*) as total FROM messages WHERE patient_id = ?',
      [patient_id]
    );

    res.json({
      messages: rows,
      patient: {
        patient_id,
        name: patientRows[0].name
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countRows[0].total,
        pages: Math.ceil(countRows[0].total / limit)
      }
    });

  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// POST /api/admin/messaging/messages - Send message to patient
router.post('/messages', async (req, res) => {
  try {
    const { patient_id, content, subject = 'Message from Healthcare Provider' } = req.body;

    if (!patient_id || !content) {
      return res.status(400).json({ 
        error: 'Missing required fields: patient_id and content are required' 
      });
    }

    // Verify patient exists
    const [patientRows] = await pool.execute(
      'SELECT name FROM patients WHERE patient_id = ?',
      [patient_id]
    );

    if (patientRows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const [result] = await pool.execute(
      `INSERT INTO messages 
       (sender_type, sender_id, receiver_type, receiver_id, patient_id, subject, content, is_read) 
       VALUES ('admin', ?, 'patient', ?, ?, ?, ?, 0)`,
      [req.user.id, patient_id, patient_id, subject, content]
    );

    const userInfo = getUserInfo(req);

    // Log the action
    await logAudit(userInfo.admin_user_id, {
      action_type: 'MESSAGE_SENT',
      patient_id: patient_id,
      description: `Message sent to patient ${patientRows[0].name}`,
      ip_address: userInfo.ip_address
    });

    res.status(201).json({
      message: 'Message sent successfully',
      message: {
        id: result.insertId,
        sender_type: 'admin',
        sender_id: req.user.id,
        receiver_type: 'patient',
        receiver_id: patient_id,
        patient_id,
        subject,
        content,
        is_read: 0,
        created_at: new Date(),
        sender_name: 'You'
      }
    });

  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// POST /api/admin/messaging/conversations - Start new conversation
router.post('/conversations', async (req, res) => {
  try {
    const { patient_id, initial_message, subject = 'New Message' } = req.body;

    if (!patient_id || !initial_message) {
      return res.status(400).json({ 
        error: 'Missing required fields: patient_id and initial_message are required' 
      });
    }

    // Verify patient exists
    const [patientRows] = await pool.execute(
      'SELECT name FROM patients WHERE patient_id = ?',
      [patient_id]
    );

    if (patientRows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Send initial message
    const [result] = await pool.execute(
      `INSERT INTO messages 
       (sender_type, sender_id, receiver_type, receiver_id, patient_id, subject, content, is_read) 
       VALUES ('admin', ?, 'patient', ?, ?, ?, ?, 0)`,
      [req.user.id, patient_id, patient_id, subject, initial_message]
    );

    const userInfo = getUserInfo(req);

    // Log the action
    await logAudit(userInfo.admin_user_id, {
      action_type: 'CONVERSATION_STARTED',
      patient_id: patient_id,
      description: `New conversation started with patient ${patientRows[0].name}`,
      ip_address: userInfo.ip_address
    });

    res.status(201).json({
      message: 'Conversation started successfully',
      conversation: {
        id: patient_id,
        patient_id,
        name: patientRows[0].name,
        type: 'patient',
        last_message_time: new Date(),
        unread_count: 0
      }
    });

  } catch (err) {
    console.error('Error starting conversation:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// PUT /api/admin/messaging/conversations/:patient_id/read - Mark conversation as read
router.put('/conversations/:patient_id/read', async (req, res) => {
  try {
    const { patient_id } = req.params;

    const [result] = await pool.execute(
      `UPDATE messages 
       SET is_read = 1 
       WHERE patient_id = ? AND sender_type = 'patient' AND is_read = 0`,
      [patient_id]
    );

    res.json({ 
      message: 'Conversation marked as read',
      marked_read: result.affectedRows
    });

  } catch (err) {
    console.error('Error marking conversation as read:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// POST /api/admin/messaging/broadcast - Send broadcast message to multiple patients
router.post('/broadcast', async (req, res) => {
  try {
    const { recipient_group, subject, message } = req.body;

    if (!recipient_group || !subject || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields: recipient_group, subject, and message are required' 
      });
    }

    // Get patients based on recipient group
    let patientQuery = 'SELECT patient_id, name FROM patients WHERE 1=1';
    const queryParams = [];

    switch (recipient_group) {
      case 'all_patients':
        // No additional filters
        break;
      case 'with_appointments':
        patientQuery += ' AND patient_id IN (SELECT DISTINCT patient_id FROM appointments WHERE status = "scheduled")';
        break;
      case 'needing_followup':
        // Example: Patients with reactive HIV status
        patientQuery += ' AND hiv_status = "Reactive"';
        break;
      case 'reactive_patients':
        patientQuery += ' AND hiv_status = "Reactive"';
        break;
      default:
        return res.status(400).json({ error: 'Invalid recipient group' });
    }

    const [patientRows] = await pool.execute(patientQuery, queryParams);

    if (patientRows.length === 0) {
      return res.status(404).json({ error: 'No patients found for the specified group' });
    }

    // Send message to each patient
    const insertPromises = patientRows.map(patient => 
      pool.execute(
        `INSERT INTO messages 
         (sender_type, sender_id, receiver_type, receiver_id, patient_id, subject, content, is_read) 
         VALUES ('admin', ?, 'patient', ?, ?, ?, ?, 0)`,
        [req.user.id, patient.patient_id, patient.patient_id, subject, message]
      )
    );

    await Promise.all(insertPromises);

    const userInfo = getUserInfo(req);

    // Log the action
    await logAudit(userInfo.admin_user_id, {
      action_type: 'BROADCAST_MESSAGE_SENT',
      description: `Broadcast message sent to ${patientRows.length} patients in group: ${recipient_group}`,
      ip_address: userInfo.ip_address
    });

    res.json({
      message: `Broadcast message sent successfully to ${patientRows.length} patients`,
      recipients: patientRows.length,
      group: recipient_group
    });

  } catch (err) {
    console.error('Error sending broadcast message:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// GET /api/admin/messaging/stats - Get messaging statistics
router.get('/stats', async (req, res) => {
  try {
    // Get total messages count
    const [totalResult] = await pool.execute('SELECT COUNT(*) as total FROM messages');
    const total = totalResult[0].total;

    // Get unread messages count
    const [unreadResult] = await pool.execute(
      'SELECT COUNT(*) as unread FROM messages WHERE is_read = 0 AND sender_type = "patient"'
    );

    // Get messages by type
    const [typeResult] = await pool.execute(`
      SELECT 
        sender_type,
        COUNT(*) as count
      FROM messages
      GROUP BY sender_type
    `);

    // Get daily message stats for last 30 days
    const [dailyResult] = await pool.execute(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM messages
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    // Get most active conversations
    const [activeResult] = await pool.execute(`
      SELECT 
        m.patient_id,
        p.name as patient_name,
        COUNT(*) as message_count
      FROM messages m
      JOIN patients p ON m.patient_id = p.patient_id
      GROUP BY m.patient_id, p.name
      ORDER BY message_count DESC
      LIMIT 10
    `);

    const stats = {
      total_messages: parseInt(total),
      unread_messages: parseInt(unreadResult[0].unread),
      messages_by_type: typeResult,
      daily_trends: dailyResult,
      active_conversations: activeResult
    };

    res.json(stats);

  } catch (err) {
    console.error('Error fetching messaging stats:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

module.exports = router;