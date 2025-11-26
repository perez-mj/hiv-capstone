const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/biometric/verify/:biometric_id
router.get('/verify/:biometric_id', async (req, res, next) => {
  try {
    const { biometric_id } = req.params;

    const [rows] = await pool.execute(
      `SELECT bl.biometric_id, p.patient_id, p.name, p.consent, p.hiv_status
       FROM biometric_links bl
       JOIN patients p ON bl.patient_id = p.patient_id
       WHERE bl.biometric_id = ?`,
      [biometric_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Biometric ID not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;