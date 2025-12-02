// --- backend/db.js ---
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hiv_enrollment_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection
pool.getConnection()
  .then(connection => {
    console.log('\u2705 Database connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('\u274c Database connection failed:', err.message);
  });

module.exports = pool;