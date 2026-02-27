// --- backend/server.js ---
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
const { setupAppointmentScheduler } = require('./services/appointmentScheduler');

// After database connection is established
setupAppointmentScheduler();

// Import routes
const patientRoutes = require('./routes/patients');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const appointmentsRouter = require('./routes/appointments');
const queueRouter = require('./routes/queue');
const encountersRouter = require('./routes/encounters');
const labResultsRouter = require('./routes/lab-results');
const kioskRoutes = require('./routes/kiosk');

app.use('/api/kiosk', kioskRoutes);
app.use('/api/encounters', encountersRouter);
app.use('/api/lab-results', labResultsRouter);
app.use('/api/queue', queueRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/users', usersRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/auth', authRoutes);


// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'HIV Enrollment System API', 
    status: 'running',
    version: '3.0.0'
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