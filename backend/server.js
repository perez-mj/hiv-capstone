// --- backend/server.js ---
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import blockchain service
const blockchainService = require('./blockchain/blockchainService');

// Import auth middleware
const { authenticateToken } = require('./middleware/auth');
const { authorize } = require('./middleware/authorize');

const { setupAppointmentScheduler } = require('./services/appointmentScheduler');

// After database connection is established
setupAppointmentScheduler();

// Initialize blockchain with proper error handling
console.log('🔗 Initializing blockchain...');
try {
  const stats = blockchainService.getStats();
  const totalBlocks = stats && stats.total_blocks ? stats.total_blocks : 1;
  const isValid = stats && stats.is_valid ? stats.is_valid.valid : true;
  console.log(`✅ Blockchain initialized with ${totalBlocks} blocks`);
  console.log(`   Blockchain valid: ${isValid}`);
} catch (error) {
  console.log('⚠️ Blockchain error:', error.message);
  console.log('⚠️ Continuing without blockchain...');
}

// Import routes
const patientRoutes = require('./routes/patients');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const appointmentsRouter = require('./routes/appointments');
const queueRouter = require('./routes/queue');
const encountersRouter = require('./routes/encounters');
const labResultsRouter = require('./routes/lab-results');
const kioskRoutes = require('./routes/kiosk');
const staffRoutes = require('./routes/staff');
const dashboardRoutes = require('./routes/dashboard');

app.use('/api/staff', staffRoutes);
app.use('/api/dashboard', dashboardRoutes);
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

// Blockchain info endpoint
app.get('/api/blockchain/info', async (req, res) => {
  try {
    const info = await blockchainService.getInfo();
    res.json({ success: true, data: info });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Blockchain verify endpoint
app.get('/api/blockchain/verify', async (req, res) => {
  try {
    const result = await blockchainService.verifyIntegrity();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Blockchain export endpoint (admin only)
app.get('/api/blockchain/export', authenticateToken, authorize('ADMIN'), async (req, res) => {
  try {
    const exportData = await blockchainService.exportBlockchain();
    res.json({ success: true, data: exportData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
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
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/`);
  console.log(`🔗 Blockchain API: http://localhost:${PORT}/api/blockchain/info`);
});