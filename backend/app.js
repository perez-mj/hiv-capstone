// backend/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/appointment-settings', require('./routes/appointmentSettings'));
app.use('/api/transaction-types', require('./routes/transactionTypeRoutes'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/appointments', require('./routes/appointmentAvailability'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/queue', require('./routes/queue'));
app.use('/api/testing', require('./routes/testing'));
app.use('/api/treatment', require('./routes/treatment'));
app.use('/api/blockchain', require('./routes/blockchain'));
app.use('/api/backup', require('./routes/backup'));
app.use('/api/kiosk', require('./routes/kiosk'));
// app.use('/api/reports', require('./routes/reports'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;