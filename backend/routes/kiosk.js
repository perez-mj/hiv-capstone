// backend/routes/kiosk.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize'); // Fixed: This is correct

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

// Protected kiosk endpoint - requires valid device (but NOT user auth)
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

    // Get current serving
    const [currentServing] = await pool.execute(
      `SELECT 
        q.queue_number,
        CONCAT('Window ', FLOOR(1 + RAND() * 3)) as window
       FROM queue q
       WHERE q.status IN ('CALLED', 'SERVING')
       ORDER BY q.updated_at DESC
       LIMIT 1`
    );

    // Get waiting list
    const [waitingList] = await pool.execute(
      `SELECT 
        q.queue_number,
        DATE_FORMAT(q.created_at, '%H:%i') as time
       FROM queue q
       WHERE q.status = 'WAITING'
       ORDER BY q.created_at ASC
       LIMIT 20`
    );

    res.json({
      success: true,
      currentServing: currentServing[0] || null,
      waitingList,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Queue data error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch queue data' 
    });
  }
});

// ========== ADMIN ROUTES (Protected) ==========

// Get all kiosk devices - requires ADMIN role
router.get(
  '/admin/devices', 
  authenticateToken, 
  authorize('ADMIN'), // Fixed: Using authorize from authorize.js
  async (req, res) => {
    try {
      console.log('🔐 Admin fetching kiosk devices, user:', req.user?.id);

      const [devices] = await pool.execute(
        `SELECT 
          id, 
          device_id, 
          COALESCE(device_name, 'Unnamed Kiosk') as device_name,
          last_seen, 
          is_authorized, 
          created_at,
          CASE 
            WHEN last_seen > DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 'Online'
            ELSE 'Offline'
          END as status
         FROM kiosk_devices
         ORDER BY created_at DESC`
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

// Authorize a device - requires ADMIN role
router.post(
  '/admin/devices/:deviceId/authorize',
  authenticateToken,
  authorize('ADMIN'), // Fixed: Using authorize from authorize.js
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
  authorize('ADMIN'), // Fixed: Using authorize from authorize.js
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
  authorize('ADMIN'), // Fixed: Using authorize from authorize.js
  async (req, res) => {
    try {
      const { deviceId } = req.params;
      const { device_name } = req.body;
      
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

// backend/routes/kiosk.js - Add this route

// Clean up inactive devices (can be called by a cron job)
router.delete('/admin/devices/cleanup/inactive', 
  authenticateToken, 
  authorize('ADMIN'),
  async (req, res) => {
    try {
      const [result] = await pool.execute(
        'DELETE FROM kiosk_devices WHERE last_seen < DATE_SUB(NOW(), INTERVAL 1 HOUR) AND is_authorized = 0'
      );
      
      res.json({
        success: true,
        deletedCount: result.affectedRows
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
  authorize('ADMIN'), // Fixed: Using authorize from authorize.js
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

module.exports = router;