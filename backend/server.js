// backend/server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const blockchainAuditService = require('./services/blockchainAuditService');
const auditRoutes = require('./routes/auditRoutes');
const os = require('os');

const app = express();

// Debug: Show system information
console.log('\n🖥️ System Information:');
console.log(`   Platform: ${os.platform()}`);
console.log(`   Node Version: ${process.version}`);
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);

// Debug: Check if blockchain env vars are loaded
console.log('\n📋 Blockchain Configuration:');
console.log(`   MULTICHAIN_HOST: ${process.env.MULTICHAIN_HOST || 'localhost'}`);
console.log(`   MULTICHAIN_PORT: ${process.env.MULTICHAIN_PORT || '7447'}`);
console.log(`   MULTICHAIN_USER: ${process.env.MULTICHAIN_USER || 'multichainrpc'}`);
console.log(`   MULTICHAIN_PASSWORD: ${process.env.MULTICHAIN_PASSWORD ? '✓ Set' : '✗ Not set'}`);
console.log(`   MULTICHAIN_CHAINNAME: ${process.env.MULTICHAIN_CHAINNAME || 'omph_hiv_chain'}`);
console.log(`   MULTICHAIN_API_TIMEOUT: ${process.env.MULTICHAIN_API_TIMEOUT || '30000'}ms`);
console.log(`   BLOCKCHAIN_ENABLED: ${process.env.BLOCKCHAIN_ENABLED !== 'false' ? 'Yes' : 'No'}`);

// Check MultiChain availability
const checkMultiChainAvailability = async () => {
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);
  
  try {
    // Check if multichain-cli is accessible
    await execPromise('multichain-cli --help', { timeout: 5000 });
    console.log('✅ MultiChain CLI is accessible');
    return true;
  } catch (error) {
    console.warn('⚠️ MultiChain CLI not found. Blockchain features will be limited.');
    console.warn('   Make sure MultiChain is installed and in PATH');
    return false;
  }
};

// Initialize blockchain service on server start
let blockchainInitialized = false;

(async () => {
  try {
    // Check if blockchain should be enabled
    const blockchainEnabled = process.env.BLOCKCHAIN_ENABLED !== 'false';
    
    if (!blockchainEnabled) {
      console.log('⚠️ Blockchain service is disabled by configuration');
      console.log('   Set BLOCKCHAIN_ENABLED=true in .env to enable');
      return;
    }
    
    // Check MultiChain availability first
    const multiChainAvailable = await checkMultiChainAvailability();
    
    if (!multiChainAvailable && process.env.BLOCKCHAIN_REQUIRED === 'true') {
      console.error('❌ Blockchain is required but MultiChain is not available');
      console.error('   Please install MultiChain: https://www.multichain.com/download/');
      if (os.platform() === 'win32') {
        console.error('   On Windows, ensure MultiChain is in your PATH');
      }
      process.exit(1);
    }
    
    // Initialize blockchain service with retry logic
    let retries = 3;
    let initialized = false;
    
    while (retries > 0 && !initialized) {
      try {
        console.log(`\n🔗 Initializing blockchain service (attempt ${4 - retries}/3)...`);
        initialized = await blockchainAuditService.initialize();
        
        if (initialized && blockchainAuditService.enabled) {
          console.log('✅ Blockchain audit service is active');
          
          // List available streams
          try {
            const streams = await blockchainAuditService.listStreams();
            if (streams && streams.length > 0) {
              console.log(`📋 Available streams: ${streams.length}`);
              streams.slice(0, 10).forEach(stream => {
                console.log(`   - ${stream.name} (${stream.items || 0} items)`);
              });
              if (streams.length > 10) {
                console.log(`   ... and ${streams.length - 10} more`);
              }
            } else {
              console.log('📋 No streams available yet');
              console.log('   Run: npm run blockchain:setup to create required streams');
            }
          } catch (streamError) {
            console.warn('⚠️ Could not list streams:', streamError.message);
          }
          break;
        } else {
          console.warn(`⚠️ Blockchain service initialization failed (attempt ${4 - retries}/3)`);
          if (retries > 1) {
            console.log('   Retrying in 5 seconds...');
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
      } catch (error) {
        console.error(`❌ Blockchain initialization error (attempt ${4 - retries}/3):`, error.message);
        if (retries > 1) {
          console.log('   Retrying in 5 seconds...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
      
      retries--;
    }
    
    if (!initialized) {
      console.log('⚠️ Blockchain audit service running in fallback mode (no blockchain integration)');
      console.log('\n💡 To enable blockchain features:');
      console.log('   1. Install MultiChain: https://www.multichain.com/download/');
      console.log('   2. Run setup: npm run blockchain:setup');
      console.log('   3. Start blockchain: npm run blockchain:start');
      console.log('   4. Restart this server');
    } else {
      blockchainInitialized = true;
    }
  } catch (error) {
    console.error('❌ Blockchain service unavailable - running without blockchain:', error.message);
    if (process.env.BLOCKCHAIN_REQUIRED === 'true') {
      console.error('   Blockchain is required but failed to initialize. Exiting...');
      process.exit(1);
    }
  }
})();

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\n⚠️ Received ${signal}, starting graceful shutdown...`);
  
  try {
    if (blockchainInitialized && blockchainAuditService && blockchainAuditService.enabled) {
      console.log('🔌 Disconnecting blockchain service...');
      // Add any cleanup logic here if needed
      // await blockchainAuditService.disconnect();
    }
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased limit for blockchain data
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware (for debugging)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Import routes
const routes = require('./routes');

// Setup appointment scheduler
const { setupAppointmentScheduler } = require('./services/appointmentScheduler');

// After database connection is established
try {
  setupAppointmentScheduler();
  console.log('✅ Appointment scheduler initialized');
} catch (error) {
  console.error('❌ Failed to initialize appointment scheduler:', error.message);
}

// Routes
app.use('/api', routes);
app.use('/api/audit', auditRoutes);

// Health check with blockchain status
app.get('/', (req, res) => {
  const healthStatus = {
    message: 'HIV Enrollment System API',
    status: 'running',
    version: '3.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    platform: os.platform(),
    blockchain: {
      enabled: blockchainAuditService?.enabled || false,
      initialized: blockchainAuditService?.initialized || false,
      required: process.env.BLOCKCHAIN_REQUIRED === 'true'
    }
  };
  
  res.json(healthStatus);
});

// Detailed blockchain status endpoint
app.get('/api/blockchain/status', async (req, res) => {
  try {
    if (!blockchainAuditService || !blockchainAuditService.enabled) {
      return res.status(503).json({
        error: 'Blockchain service is not available',
        enabled: false,
        initialized: false
      });
    }
    
    const status = await blockchainAuditService.getStatus();
    res.json({
      enabled: true,
      initialized: blockchainAuditService.initialized,
      ...status
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get blockchain status',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Handle specific error types
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ 
      error: 'Invalid JSON payload',
      message: 'Request body contains malformed JSON'
    });
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Backend running at http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/`);
  console.log(`🔍 Audit API: http://localhost:${PORT}/api/audit/audit-trail`);
  console.log(`🔗 Blockchain status: http://localhost:${PORT}/api/blockchain/status`);
  console.log(`\n💡 Available endpoints:`);
  console.log(`   GET  / - Health check`);
  console.log(`   GET  /api/blockchain/status - Blockchain status`);
  console.log(`   GET  /api/audit/audit-trail - View audit trail`);
  console.log(`   POST /api/audit/log - Add audit log`);
  console.log(`\n📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌍 Platform: ${os.platform()}`);
  console.log(`🕒 Started: ${new Date().toISOString()}\n`);
});

// Export for testing
module.exports = { app, server };