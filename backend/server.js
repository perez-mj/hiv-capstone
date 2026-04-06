// --- backend/server.js ---
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import auth middleware
const { authenticateToken } = require('./middleware/auth');
const { authorize } = require('./middleware/authorize');

const { setupAppointmentScheduler } = require('./services/appointmentScheduler');

// After database connection is established
setupAppointmentScheduler();


// Import routes
const routes = require('./routes');

app.use('/api', routes);

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
});