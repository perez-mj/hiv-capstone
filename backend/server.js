// backend/server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const blockchainAuditService = require('./services/blockchainAuditService');
const auditRoutes = require('./routes/auditRoutes');

const app = express();

// Debug: Check if blockchain env vars are loaded
console.log('\n📋 Blockchain Configuration:');
console.log(`   MULTICHAIN_HOST: ${process.env.MULTICHAIN_HOST}`);
console.log(`   MULTICHAIN_PORT: ${process.env.MULTICHAIN_PORT}`);
console.log(`   MULTICHAIN_USER: ${process.env.MULTICHAIN_USER}`);
console.log(`   MULTICHAIN_PASSWORD: ${process.env.MULTICHAIN_PASSWORD ? '✓ Set' : '✗ Not set'}`);
console.log(`   MULTICHAIN_CHAINNAME: ${process.env.MULTICHAIN_CHAINNAME}\n`);

// Initialize blockchain service on server start
(async () => {
  try {
    const initialized = await blockchainAuditService.initialize();
    if (initialized && blockchainAuditService.enabled) {
      console.log('✅ Blockchain audit service is active');
      
      // List available streams
      const streams = await blockchainAuditService.listStreams();
      console.log(`📋 Available streams: ${streams.length}`);
      streams.forEach(stream => {
        console.log(`   - ${stream.name} (${stream.items || 0} items)`);
      });
    } else {
      console.log('⚠️  Blockchain audit service running in fallback mode');
    }
  } catch (error) {
    console.error('❌ Blockchain service unavailable - running without blockchain:', error.message);
  }
})();

// Middleware
app.use(cors());
app.use(express.json());

const { setupAppointmentScheduler } = require('./services/appointmentScheduler');

// After database connection is established
setupAppointmentScheduler();

// Import routes
const routes = require('./routes');

app.use('/api', routes);
app.use('/api/audit', auditRoutes);

// Health check with blockchain status
app.get('/', (req, res) => {
  res.json({ 
    message: 'HIV Enrollment System API', 
    status: 'running',
    version: '3.0.0',
    blockchain: {
      enabled: blockchainAuditService.enabled,
      initialized: blockchainAuditService.initialized
    }
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
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Backend running at http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/`);
  console.log(`🔍 Audit API: http://localhost:${PORT}/api/audit/audit-trail\n`);
});