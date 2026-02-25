// backend/middleware/kioskAuth.js
const pool = require('../db');

const authorizeKiosk = async (req, res, next) => {
  const deviceId = req.query.device || req.headers['x-device-id'];

  if (!deviceId) {
    return res.status(401).json({ 
      success: false, 
      error: 'Device ID required' 
    });
  }

  try {
    // Check if device is authorized
    const [devices] = await pool.execute(
      'SELECT id, device_id, is_authorized FROM kiosk_devices WHERE device_id = ?',
      [deviceId]
    );

    if (devices.length === 0) {
      // Device not registered - auto-register but not authorized
      const [result] = await pool.execute(
        'INSERT INTO kiosk_devices (device_id, last_seen) VALUES (?, NOW())',
        [deviceId]
      );
      
      return res.status(403).json({ 
        success: false, 
        error: 'Device pending authorization',
        deviceId: deviceId
      });
    }

    const device = devices[0];

    if (!device.is_authorized) {
      return res.status(403).json({ 
        success: false, 
        error: 'Device not authorized',
        deviceId: deviceId
      });
    }

    // Update last seen
    await pool.execute(
      'UPDATE kiosk_devices SET last_seen = NOW() WHERE id = ?',
      [device.id]
    );

    req.kioskDevice = device;
    next();
  } catch (error) {
    console.error('Kiosk auth error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Authorization failed' 
    });
  }
};

module.exports = { authorizeKiosk };