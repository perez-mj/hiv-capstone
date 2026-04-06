// backend/routes/labResultRoutes.js
const express = require('express');
const router = express.Router();
const labResultController = require('../controllers/labResultController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { validate, validatePagination, validateDateRange } = require('../middleware/validate');
const { validateLabResultCreate, validateLabResultUpdate } = require('../validations/labResultValidation');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/lab-results');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `lab-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPEG, and PNG are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// All lab result routes require authentication
router.use(protect);

// Routes accessible by ADMIN and NURSE
router.get('/', authorize('ADMIN', 'NURSE'), validatePagination, validateDateRange, labResultController.getAllLabResults);
router.get('/type/:testType', authorize('ADMIN', 'NURSE'), validatePagination, labResultController.getByTestType);
router.get('/stats', authorize('ADMIN', 'NURSE'), labResultController.getStatistics);
router.get('/recent', authorize('ADMIN', 'NURSE'), labResultController.getRecent);
router.get('/:id', authorize('ADMIN', 'NURSE'), labResultController.getLabResultById);
router.post('/', authorize('ADMIN', 'NURSE'), upload.single('file'), validate(validateLabResultCreate), labResultController.createLabResult);
router.post('/upload', authorize('ADMIN', 'NURSE'), upload.single('file'), labResultController.uploadFile);
router.put('/:id', authorize('ADMIN', 'NURSE'), upload.single('file'), validate(validateLabResultUpdate), labResultController.updateLabResult);
router.get('/download/:id', authorize('ADMIN', 'NURSE'), labResultController.downloadFile);

// Patient-specific routes (accessible by PATIENT for their own records)
router.get('/patient/:patientId', labResultController.getByPatient);

// Admin-only routes
router.delete('/:id', authorize('ADMIN'), labResultController.deleteLabResult);

module.exports = router;