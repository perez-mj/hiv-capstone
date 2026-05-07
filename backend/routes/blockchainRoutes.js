// backend/routes/blockchainRoutes.js

const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/auth');
const multichainService = require('../services/multichainService');

// PUBLIC: Basic blockchain status - no auth required
router.get('/status', async (req, res) => {
  try {
    // Check if MultiChain is configured and reachable
    const isAvailable = await multichainService.isAvailable().catch(() => false);
    
    res.json({ 
      success: true, 
      data: {
        available: isAvailable,
        message: isAvailable ? 'Blockchain service is operational' : 'Blockchain service is unavailable',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.json({ 
      success: true, 
      data: {
        available: false,
        message: 'Blockchain service is unavailable',
        error: error.message
      }
    });
  }
});

// PROTECTED: Full blockchain info - requires ADMIN
router.get('/info', authenticateToken, authorize('ADMIN'), async (req, res) => {
  try {
    const info = await multichainService.getInfo();
    res.json({ success: true, data: info });
  } catch (error) {
    console.error('Error in /info:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PROTECTED: Admin-only routes
router.get('/blocks', authenticateToken, authorize('ADMIN'), async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;
    const blocks = await multichainService.getBlocks(parseInt(limit), parseInt(offset));
    res.json({ success: true, data: blocks });
  } catch (error) {
    console.error('Error in /blocks:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/streams', authenticateToken, authorize('ADMIN'), async (req, res) => {
  try {
    const streams = await multichainService.getStreams();
    res.json({ success: true, data: streams });
  } catch (error) {
    console.error('Error in /streams:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/verify', authenticateToken, authorize('ADMIN'), async (req, res) => {
  try {
    const verification = await multichainService.verifyIntegrity();
    res.json({ success: true, data: verification });
  } catch (error) {
    console.error('Error in /verify:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/growth', authenticateToken, authorize('ADMIN'), async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 25000);
    });
    
    const growthPromise = multichainService.getBlockGrowth(period);
    const growth = await Promise.race([growthPromise, timeoutPromise]);
    
    res.json({ success: true, data: growth });
  } catch (error) {
    console.error('Error in /growth:', error);
    
    const simulatedData = multichainService.getSimulatedGrowthData(req.query.period || 'month');
    res.json({ 
      success: true, 
      data: simulatedData,
      warning: 'Using simulated data due to timeout or error'
    });
  }
});

router.get('/diagnostics', authenticateToken, authorize('ADMIN'), async (req, res) => {
  try {
    const diagnostics = await multichainService.runDiagnostics();
    res.json({ success: true, data: diagnostics });
  } catch (error) {
    console.error('Error in /diagnostics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/stats', authenticateToken, authorize('ADMIN'), async (req, res) => {
  try {
    const info = await multichainService.getInfo();
    const streams = await multichainService.getStreams();
    const verification = await multichainService.verifyIntegrity();
    
    res.json({ 
      success: true, 
      data: {
        network: info,
        streams: streams,
        verification: verification
      }
    });
  } catch (error) {
    console.error('Error in /stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/cache/clear', authenticateToken, authorize('ADMIN'), async (req, res) => {
  try {
    multichainService.clearCache();
    res.json({ success: true, message: 'Cache cleared successfully' });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;