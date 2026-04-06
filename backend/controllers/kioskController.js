// backend/controllers/kioskController.js
const KioskDevice = require('../models/KioskDevice');
const { sendResponse } = require('../utils/responseHandler');

const kioskController = {
  // Check device status (public)
  async checkStatus(req, res, next) {
    try {
      const { deviceId } = req.params;
      
      let device = await KioskDevice.findByDeviceId(deviceId);
      
      if (!device) {
        // Auto-register new device
        await KioskDevice.register(deviceId);
        return sendResponse(res, 200, 'Device registered, pending authorization', {
          authorized: false,
          deviceId: deviceId,
          message: 'Device registered, pending authorization'
        });
      }

      // Update last seen
      await KioskDevice.updateLastSeen(deviceId);

      sendResponse(res, 200, 'Device status retrieved', {
        authorized: device.is_authorized === 1,
        deviceId: deviceId
      });
    } catch (error) {
      next(error);
    }
  },

  // Get queue data for kiosk display
  async getQueueData(req, res, next) {
    try {
      const deviceId = req.query.device;
      
      if (!deviceId) {
        return sendResponse(res, 400, 'Device ID required');
      }

      // Check if device is authorized
      const device = await KioskDevice.findByDeviceId(deviceId);
      if (!device || !device.is_authorized) {
        return sendResponse(res, 403, 'Device not authorized');
      }

      // Update last seen
      await KioskDevice.updateLastSeen(deviceId);

      // Get current serving patients
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
        LIMIT 5`
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

      // Process grouped data
      const waitingList = [];
      waitingByType.forEach(group => {
        if (group.patients) {
          const patients = group.patients.split('|').map(p => JSON.parse(p));
          waitingList.push({
            type: group.appointment_type || 'Other',
            count: group.count,
            next_number: group.next_number,
            patients: patients.slice(0, 5)
          });
        }
      });

      // Get all waiting patients (flat list)
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

      // Calculate estimated wait times
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

      const avgWaitMap = {};
      avgWaitTimes.forEach(item => {
        avgWaitMap[item.type_name] = Math.round(item.avg_wait || 0);
      });

      sendResponse(res, 200, 'Queue data retrieved', {
        currentServing: currentServing || [],
        waitingByType: waitingList,
        waitingList: allWaiting,
        stats: {
          total_in_queue: stats[0]?.total_in_queue || 0,
          waiting_count: stats[0]?.waiting || 0,
          serving_count: stats[0]?.serving || 0,
          called_count: stats[0]?.called || 0
        },
        avgWaitTimes: avgWaitMap,
        timestamp: Date.now()
      });
    } catch (error) {
      next(error);
    }
  },

  // Get queue statistics for kiosk
  async getQueueStats(req, res, next) {
    try {
      const deviceId = req.query.device;
      
      if (!deviceId) {
        return sendResponse(res, 400, 'Device ID required');
      }

      const device = await KioskDevice.findByDeviceId(deviceId);
      if (!device || !device.is_authorized) {
        return sendResponse(res, 403, 'Device not authorized');
      }

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

      sendResponse(res, 200, 'Queue statistics retrieved', stats[0] || {
        total_in_queue: 0,
        waiting: 0,
        called: 0,
        serving: 0,
        avg_service_time: 0
      });
    } catch (error) {
      next(error);
    }
  },

  // ========== ADMIN CONTROLLERS ==========
  
  // Get all kiosk devices (Admin only)
  async getAllDevices(req, res, next) {
    try {
      const devices = await KioskDevice.getAllDevices();
      sendResponse(res, 200, 'Devices retrieved successfully', devices);
    } catch (error) {
      next(error);
    }
  },

  // Get single device details (Admin only)
  async getDeviceDetails(req, res, next) {
    try {
      const { deviceId } = req.params;
      const device = await KioskDevice.getDeviceDetails(deviceId);
      
      if (!device) {
        return sendResponse(res, 404, 'Device not found');
      }
      
      sendResponse(res, 200, 'Device details retrieved', device);
    } catch (error) {
      next(error);
    }
  },

  // Authorize device (Admin only)
  async authorizeDevice(req, res, next) {
    try {
      const { deviceId } = req.params;
      const authorized = await KioskDevice.authorize(deviceId, true);
      
      if (!authorized) {
        return sendResponse(res, 404, 'Device not found');
      }
      
      sendResponse(res, 200, 'Device authorized successfully');
    } catch (error) {
      next(error);
    }
  },

  // Deauthorize device (Admin only)
  async deauthorizeDevice(req, res, next) {
    try {
      const { deviceId } = req.params;
      const deauthorized = await KioskDevice.authorize(deviceId, false);
      
      if (!deauthorized) {
        return sendResponse(res, 404, 'Device not found');
      }
      
      sendResponse(res, 200, 'Device deauthorized successfully');
    } catch (error) {
      next(error);
    }
  },

  // Update device name (Admin only)
  async updateDevice(req, res, next) {
    try {
      const { deviceId } = req.params;
      const { device_name } = req.body;
      
      if (!device_name) {
        return sendResponse(res, 400, 'Device name is required');
      }
      
      const updated = await KioskDevice.updateDeviceName(deviceId, device_name);
      
      if (!updated) {
        return sendResponse(res, 404, 'Device not found');
      }
      
      sendResponse(res, 200, 'Device updated successfully');
    } catch (error) {
      next(error);
    }
  },

  // Cleanup inactive devices (Admin only)
  async cleanupInactive(req, res, next) {
    try {
      const deletedCount = await KioskDevice.cleanupInactiveDevices(24);
      sendResponse(res, 200, `Cleaned up ${deletedCount} inactive devices`, { deletedCount });
    } catch (error) {
      next(error);
    }
  },

  // Delete device (Admin only)
  async deleteDevice(req, res, next) {
    try {
      const { deviceId } = req.params;
      const deleted = await KioskDevice.delete(deviceId);
      
      if (!deleted) {
        return sendResponse(res, 404, 'Device not found');
      }
      
      sendResponse(res, 200, 'Device deleted successfully');
    } catch (error) {
      next(error);
    }
  },

  // Get activity log (Admin only)
  async getActivityLog(req, res, next) {
    try {
      const { limit = 50, device_id } = req.query;
      const activity = await KioskDevice.getActivityLog(limit, device_id);
      sendResponse(res, 200, 'Activity log retrieved', activity);
    } catch (error) {
      next(error);
    }
  }
};

module.exports = kioskController;