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
const adminRoutes = require('./routes/admin');

const patientAuthRoutes = require('./routes/patientAuth');
const patientAppointmentRoutes = require('./routes/patientAppointments');
const patientMessageRoutes = require('./routes/patientMessages');
const patientTestRoutes = require('./routes/patientTests');

const adminAppointmentRoutes = require('./routes/adminAppointments');
const adminMessagingRoutes = require('./routes/adminMessaging');
// Add this import at the top with other imports
const patientContactRoutes = require('./routes/patientContacts');

// Add this with other route mounts
app.use('/api/patient/contacts', patientContactRoutes);
// Use the routes
app.use('/api/admin/appointments', adminAppointmentRoutes);
app.use('/api/admin/messaging', adminMessagingRoutes);

// Patient routes
app.use('/api/patient/auth', patientAuthRoutes);
app.use('/api/patient/appointments', patientAppointmentRoutes);
app.use('/api/patient/messages', patientMessageRoutes);
app.use('/api/patient/tests', patientTestRoutes);

// Routes
app.use('/api/patients', patientRoutes);
app.use('/api/dlt', dltRoutes);
app.use('/api/biometric', biometricRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/admin', adminRoutes);


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