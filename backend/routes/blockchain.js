// backend/routes/blockchain.js
const express = require('express');
const router = express.Router();
const blockchainService = require('../services/blockchainService');
const auth = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');

router.get('/status', auth, roleCheck('admin'), async (req, res) => {
  try {
    const status = await blockchainService.getStatus(req.user.id, req);
    res.json(status);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/info', auth, roleCheck('admin'), async (req, res) => {
  try {
    res.json(await blockchainService.getChainInfo(req.user.id, req));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/items', auth, roleCheck('admin'), async (req, res) => {
  try {
    const count = Math.min(parseInt(req.query.count) || 20, 200);
    const verbose = req.query.verbose === 'true';
    res.json(await blockchainService.listRecentItems(count, verbose, req.user.id, req));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/verify/:txid', auth, roleCheck('admin'), async (req, res) => {
  try {
    const result = await blockchainService.verify(req.params.txid, null, req.user.id, req);
    if (!result.found) return res.status(404).json(result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// backend/routes/blockchain.js
router.get('/verify/patient/:patientId', auth, roleCheck('admin', 'staff'), async (req, res) => {
  try {
    const result = await blockchainService.verifyPatientAgainstChain(
      parseInt(req.params.patientId),
      req.user.id,
      req
    );
    if (!result.found) return res.status(404).json(result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;