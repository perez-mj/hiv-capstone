// backend/server.js
require('dotenv').config();
const app = require('./app');
const db = require('./models');
const http = require('http');
const socketIO = require('socket.io');
const socketService = require('./services/socketService');

const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || '*',
        credentials: true
    }
});

socketService.initialize(io);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  socket.on('join-queue', (office) => {
    socket.join(`queue-${office}`);
    console.log(`Client ${socket.id} joined queue-${office}`);
  });
  
  socket.on('leave-queue', (office) => {
    socket.leave(`queue-${office}`);
    console.log(`Client ${socket.id} left queue-${office}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});


// Sync database and start server
const PORT = process.env.PORT || 3000;

// FIXED: Handle database sync with better error handling
async function initializeDatabase() {
  try {
    // Check if we should sync
    if (process.env.NODE_ENV === 'production') {
      // In production, just authenticate, don't sync
      console.log('Production mode: Skipping auto-sync, using migrations');
      await db.sequelize.authenticate();
      console.log('Database connection established successfully.');
    } else {
      // In development, sync with caution
      console.log('Development mode: Syncing database...');
      
      // Try to sync without altering first (safer)
      try {
        await db.sequelize.sync({ alter: false });
        console.log('Database synced successfully (without alter).');
      } catch (syncError) {
        console.error('Sync without alter failed:', syncError.message);
        console.log('Attempting to sync with alter...');
        await db.sequelize.sync({ alter: true });
        console.log('Database synced successfully (with alter).');
      }
    }
    
    // Start server after successful sync
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Unable to sync database:', error);
    
    // Still start the server even if sync fails
    // The app might still work if tables already exist
    console.log('Starting server despite sync issues...');
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT} (with potential database issues)`);
    });
  }
}

// Call the initialization function
initializeDatabase();