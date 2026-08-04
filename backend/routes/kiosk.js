const express = require('express');
const router = express.Router();

const kioskController = require('../controllers/kioskController');

router.post('/checkin', kioskController.checkIn);

// router.post('/walkin', kioskController.walkIn);

// router.get('/display/:office', kioskController.display);

router.get('/status', (req, res) => {
    res.json({
        status: 'online'
    });
});

module.exports = router;