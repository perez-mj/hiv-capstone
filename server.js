// --- backend/server.js ---
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import routes
const patientRoutes = require('./routes/patients');
const dltRoutes = require('./routes/dlt');
const biometricRoutes = require('./routes/biometric');
const authRoutes = require('./routes/auth');
const auditRoutes = require('./routes/audit');

// Routes
app.use('/api/patients', patientRoutes);
app.use('/api/dlt', dltRoutes);
app.use('/api/biometric', biometricRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/audit', auditRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'HIV Enrollment & DLT Integrity System API', 
    status: 'running',
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('/', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/`);
});