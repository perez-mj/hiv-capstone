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

      // Get all queue data from models
      const [currentServing, waitingByType, waitingList, stats, avgWaitTimes] = await Promise.all([
        KioskDevice.getCurrentServing(),
        KioskDevice.getWaitingByType(),
        KioskDevice.getAllWaiting(),
        KioskDevice.getQueueStats(),
        KioskDevice.getAverageWaitTimes()
      ]);

      sendResponse(res, 200, 'Queue data retrieved', {
        currentServing: currentServing || [],
        waitingByType: waitingByType || [],
        waitingList: waitingList || [],
        stats: {
          total_in_queue: stats.total_in_queue || 0,
          waiting_count: stats.waiting || 0,
          serving_count: stats.serving || 0,
          called_count: stats.called || 0
        },
        waitTimes: avgWaitTimes,
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

      const stats = await KioskDevice.getQueueStats();

      sendResponse(res, 200, 'Queue statistics retrieved', stats);
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