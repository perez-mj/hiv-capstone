// backend/routes/kiosk.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

// Public endpoint - NO AUTH NEEDED for kiosk status check
router.get('/status/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    console.log('📺 Kiosk status check for device:', deviceId);

    // Check if device exists
    const [devices] = await pool.execute(
      'SELECT id, device_id, is_authorized FROM kiosk_devices WHERE device_id = ?',
      [deviceId]
    );

    if (devices.length === 0) {
      // Auto-register new device
      console.log('➕ Auto-registering new kiosk:', deviceId);
      
      const [result] = await pool.execute(
        'INSERT INTO kiosk_devices (device_id, last_seen, is_authorized) VALUES (?, NOW(), 0)',
        [deviceId]
      );
      
      return res.json({
        success: true,
        authorized: false,
        deviceId: deviceId,
        message: 'Device registered, pending authorization'
      });
    }

    const device = devices[0];

    // Update last seen
    await pool.execute(
      'UPDATE kiosk_devices SET last_seen = NOW() WHERE id = ?',
      [device.id]
    );

    res.json({
      success: true,
      authorized: device.is_authorized === 1,
      deviceId: deviceId
    });

  } catch (error) {
    console.error('❌ Status check error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check status' 
    });
  }
});

router.get('/queue-data', async (req, res) => {
  try {
    const deviceId = req.query.device;
    
    if (!deviceId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Device ID required' 
      });
    }

    // Check if device is authorized
    const [devices] = await pool.execute(
      'SELECT is_authorized FROM kiosk_devices WHERE device_id = ?',
      [deviceId]
    );

    if (devices.length === 0 || !devices[0].is_authorized) {
      return res.status(403).json({ 
        success: false, 
        error: 'Device not authorized' 
      });
    }

    // Update last seen for authorized device
    await pool.execute(
      'UPDATE kiosk_devices SET last_seen = NOW() WHERE device_id = ?',
      [deviceId]
    );

    // Get current serving patients by appointment type
    const [currentServing] = await pool.execute(
      `SELECT 
        q.queue_number,
        at.type_name as appointment_type,
        at.duration_minutes,
        CONCAT(p.first_name, ' ', p.last_name) as patient_name,
        q.served_at
       FROM queue q
       JOIN appointments a ON q.appointment_id = a.id
       JOIN patients p ON a.patient_id = p.id
       LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
       WHERE q.status = 'SERVING'
         AND DATE(q.created_at) = CURDATE()
       ORDER BY q.updated_at DESC
       LIMIT 5`  // Show up to 5 concurrent serving patients
    );

    // Get waiting list grouped by appointment type
    const [waitingByType] = await pool.execute(
      `SELECT 
        at.type_name as appointment_type,
        COUNT(*) as count,
        MIN(q.queue_number) as next_number,
        GROUP_CONCAT(
          CONCAT(
            '{"queue_number":', q.queue_number,
            ',"time":"', DATE_FORMAT(q.created_at, '%H:%i'),
            '","patient":"', LEFT(p.first_name, 1), '. ', p.last_name, '"}'
          ) SEPARATOR '|'
        ) as patients
       FROM queue q
       JOIN appointments a ON q.appointment_id = a.id
       JOIN patients p ON a.patient_id = p.id
       LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
       WHERE q.status = 'WAITING'
         AND DATE(q.created_at) = CURDATE()
       GROUP BY at.type_name
       ORDER BY 
         CASE at.type_name
           WHEN 'Consultation' THEN 1
           WHEN 'Testing' THEN 2
           WHEN 'Refill' THEN 3
           ELSE 4
         END,
         MIN(q.queue_number) ASC`
    );

    // Process the grouped data
    const waitingList = [];
    waitingByType.forEach(group => {
      if (group.patients) {
        const patients = group.patients.split('|').map(p => JSON.parse(p));
        waitingList.push({
          type: group.appointment_type || 'Other',
          count: group.count,
          next_number: group.next_number,
          patients: patients.slice(0, 5) // Show only first 5 per type
        });
      }
    });

    // Get all waiting patients (flat list for display)
    const [allWaiting] = await pool.execute(
      `SELECT 
        q.queue_number,
        DATE_FORMAT(q.created_at, '%H:%i') as time,
        CONCAT(LEFT(p.first_name, 1), '. ', p.last_name) as patient_name,
        at.type_name as appointment_type
       FROM queue q
       JOIN appointments a ON q.appointment_id = a.id
       JOIN patients p ON a.patient_id = p.id
       LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
       WHERE q.status = 'WAITING'
         AND DATE(q.created_at) = CURDATE()
       ORDER BY 
         CASE at.type_name
           WHEN 'Consultation' THEN 1
           WHEN 'Testing' THEN 2
           WHEN 'Refill' THEN 3
           ELSE 4
         END,
         q.queue_number ASC
       LIMIT 20`
    );

    // Get queue statistics
    const [stats] = await pool.execute(
      `SELECT 
        COUNT(*) as total_in_queue,
        SUM(CASE WHEN status = 'WAITING' THEN 1 ELSE 0 END) as waiting,
        SUM(CASE WHEN status = 'SERVING' THEN 1 ELSE 0 END) as serving,
        SUM(CASE WHEN status = 'CALLED' THEN 1 ELSE 0 END) as called
       FROM queue
       WHERE DATE(created_at) = CURDATE()
         AND status IN ('WAITING', 'SERVING', 'CALLED')`
    );

    // Calculate estimated wait times by type
    const [avgWaitTimes] = await pool.execute(
      `SELECT 
        at.type_name,
        AVG(TIMESTAMPDIFF(MINUTE, q.created_at, q.called_at)) as avg_wait
       FROM queue q
       JOIN appointments a ON q.appointment_id = a.id
       JOIN appointment_types at ON a.appointment_type_id = at.id
       WHERE DATE(q.created_at) = CURDATE()
         AND q.status = 'COMPLETED'
       GROUP BY at.type_name`
    );

    res.json({
      success: true,
      currentServing: currentServing || [],
      waitingByType: waitingList,
      waitingList: allWaiting,
      stats: {
        total_in_queue: stats[0]?.total_in_queue || 0,
        waiting_count: stats[0]?.waiting || 0,
        serving_count: stats[0]?.serving || 0,
        called_count: stats[0]?.called || 0
      },
      avgWaitTimes: avgWaitTimes.reduce((acc, curr) => {
        acc[curr.type_name] = Math.round(curr.avg_wait || 0);
        return acc;
      }, {}),
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Queue data error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch queue data',
      details: error.message 
    });
  }
});

// Get queue statistics for kiosk display
router.get('/queue-stats', async (req, res) => {
  try {
    const deviceId = req.query.device;
    
    if (!deviceId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Device ID required' 
      });
    }

    // Check if device is authorized
    const [devices] = await pool.execute(
      'SELECT is_authorized FROM kiosk_devices WHERE device_id = ?',
      [deviceId]
    );

    if (devices.length === 0 || !devices[0].is_authorized) {
      return res.status(403).json({ 
        success: false, 
        error: 'Device not authorized' 
      });
    }

    // Get queue statistics for today
    const [stats] = await pool.execute(
      `SELECT 
        COUNT(*) as total_in_queue,
        SUM(CASE WHEN status = 'WAITING' THEN 1 ELSE 0 END) as waiting,
        SUM(CASE WHEN status = 'CALLED' THEN 1 ELSE 0 END) as called,
        SUM(CASE WHEN status = 'SERVING' THEN 1 ELSE 0 END) as serving,
        AVG(CASE WHEN status = 'COMPLETED' 
          THEN TIMESTAMPDIFF(MINUTE, created_at, completed_at) 
          ELSE NULL END) as avg_service_time
       FROM queue
       WHERE DATE(created_at) = CURDATE()`
    );

    res.json({
      success: true,
      stats: stats[0] || {
        total_in_queue: 0,
        waiting: 0,
        called: 0,
        serving: 0,
        avg_service_time: 0
      }
    });

  } catch (error) {
    console.error('Queue stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch queue statistics' 
    });
  }
});

// ========== ADMIN ROUTES (Protected) ==========

// Get all kiosk devices - requires ADMIN role
router.get(
  '/admin/devices', 
  authenticateToken, 
  authorize('ADMIN'),
  async (req, res) => {
    try {
      console.log('🔐 Admin fetching kiosk devices, user:', req.user?.id);

      const [devices] = await pool.execute(
        `SELECT 
          id, 
          device_id, 
          COALESCE(device_name, CONCAT('Kiosk-', LEFT(device_id, 8))) as device_name,
          last_seen, 
          is_authorized, 
          created_at,
          CASE 
            WHEN last_seen > DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 'Online'
            ELSE 'Offline'
          END as status,
          TIMESTAMPDIFF(MINUTE, last_seen, NOW()) as minutes_since_seen
         FROM kiosk_devices
         ORDER BY 
          is_authorized DESC,
          CASE WHEN last_seen > DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 0 ELSE 1 END,
          created_at DESC`
      );

      console.log(`📊 Found ${devices.length} devices`);

      res.json({ 
        success: true, 
        devices 
      });

    } catch (error) {
      console.error('❌ Get devices error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch devices' 
      });
    }
  }
);

// Get single device details
router.get(
  '/admin/devices/:deviceId',
  authenticateToken,
  authorize('ADMIN'),
  async (req, res) => {
    try {
      const { deviceId } = req.params;

      const [devices] = await pool.execute(
        `SELECT 
          id, 
          device_id, 
          device_name,
          last_seen, 
          is_authorized, 
          created_at,
          CASE 
            WHEN last_seen > DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 'Online'
            ELSE 'Offline'
          END as status
         FROM kiosk_devices 
         WHERE device_id = ?`,
        [deviceId]
      );

      if (devices.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'Device not found' 
        });
      }

      res.json({ 
        success: true, 
        device: devices[0] 
      });

    } catch (error) {
      console.error('Get device error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch device' 
      });
    }
  }
);

// Authorize a device - requires ADMIN role
router.post(
  '/admin/devices/:deviceId/authorize',
  authenticateToken,
  authorize('ADMIN'),
  async (req, res) => {
    try {
      const { deviceId } = req.params;
      
      const [result] = await pool.execute(
        'UPDATE kiosk_devices SET is_authorized = 1 WHERE device_id = ?',
        [deviceId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'Device not found' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Device authorized successfully' 
      });

    } catch (error) {
      console.error('Authorize error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to authorize device' 
      });
    }
  }
);

// Deauthorize a device - requires ADMIN role
router.post(
  '/admin/devices/:deviceId/deauthorize',
  authenticateToken,
  authorize('ADMIN'),
  async (req, res) => {
    try {
      const { deviceId } = req.params;
      
      const [result] = await pool.execute(
        'UPDATE kiosk_devices SET is_authorized = 0 WHERE device_id = ?',
        [deviceId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'Device not found' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Device deauthorized successfully' 
      });

    } catch (error) {
      console.error('Deauthorize error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to deauthorize device' 
      });
    }
  }
);

// Update device name - requires ADMIN role
router.put(
  '/admin/devices/:deviceId',
  authenticateToken,
  authorize('ADMIN'),
  async (req, res) => {
    try {
      const { deviceId } = req.params;
      const { device_name } = req.body;
      
      if (!device_name) {
        return res.status(400).json({ 
          success: false, 
          error: 'Device name is required' 
        });
      }

      const [result] = await pool.execute(
        'UPDATE kiosk_devices SET device_name = ? WHERE device_id = ?',
        [device_name, deviceId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'Device not found' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Device updated successfully' 
      });

    } catch (error) {
      console.error('Update error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update device' 
      });
    }
  }
);

// Clean up inactive devices (can be called by a cron job)
router.delete('/admin/devices/cleanup/inactive', 
  authenticateToken, 
  authorize('ADMIN'),
  async (req, res) => {
    try {
      const [result] = await pool.execute(
        'DELETE FROM kiosk_devices WHERE last_seen < DATE_SUB(NOW(), INTERVAL 24 HOUR) AND is_authorized = 0'
      );
      
      res.json({
        success: true,
        deletedCount: result.affectedRows,
        message: `Cleaned up ${result.affectedRows} inactive devices`
      });
    } catch (error) {
      console.error('Cleanup error:', error);
      res.status(500).json({ success: false, error: 'Cleanup failed' });
    }
  }
);

// Delete a device - requires ADMIN role
router.delete(
  '/admin/devices/:deviceId',
  authenticateToken,
  authorize('ADMIN'),
  async (req, res) => {
    try {
      const { deviceId } = req.params;
      
      const [result] = await pool.execute(
        'DELETE FROM kiosk_devices WHERE device_id = ?',
        [deviceId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'Device not found' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Device deleted successfully' 
      });

    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to delete device' 
      });
    }
  }
);

// Get kiosk activity log
router.get(
  '/admin/activity',
  authenticateToken,
  authorize('ADMIN'),
  async (req, res) => {
    try {
      const { limit = 50, device_id } = req.query;

      let query = `
        SELECT 
          kd.device_id,
          COALESCE(kd.device_name, CONCAT('Kiosk-', LEFT(kd.device_id, 8))) as device_name,
          kd.last_seen,
          kd.is_authorized,
          kd.created_at as first_seen,
          CASE 
            WHEN kd.last_seen > DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 'Online'
            ELSE 'Offline'
          END as current_status
        FROM kiosk_devices kd
        WHERE 1=1
      `;
      
      const params = [];

      if (device_id) {
        query += ` AND kd.device_id = ?`;
        params.push(device_id);
      }

      query += ` ORDER BY kd.last_seen DESC LIMIT ?`;
      params.push(parseInt(limit));

      const [activity] = await pool.execute(query, params);

      res.json({
        success: true,
        activity
      });

    } catch (error) {
      console.error('Activity log error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch activity log' 
      });
    }
  }
);

module.exports = router;