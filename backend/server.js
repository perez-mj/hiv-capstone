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


const PORT = process.env.PORT;

async function initializeDatabase() {
  try {
    if (process.env.NODE_ENV === 'production') {
      console.log('Production mode: Skipping auto-sync, using migrations');
      await db.sequelize.authenticate();
      console.log('Database connection established successfully.');
    } else {
      console.log('Development mode: Syncing database...');
      
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
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Unable to sync database:', error);
    
    console.log('Starting server despite sync issues...');
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT} (with potential database issues)`);
    });
  }
}
initializeDatabase();