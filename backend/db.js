// --- backend/db.js ---
const mysql = require('mysql2/promise');
require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_NAME'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`\u274c Missing environment variable: ${envVar}`);
  }
}

let pool = null;

try {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'omph_hiv_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  });

  // Test connection immediately
  (async () => {
    try {
      const connection = await pool.getConnection();
      console.log('\u2705 Database connected successfully');
      connection.release();
    } catch (err) {
      console.error('\u274c Database connection failed:', err.message);
      console.error('Please check your database configuration in .env file');
      pool = null;
    }
  })();
} catch (err) {
  console.error('\u274c Failed to create database pool:', err.message);
  pool = null;
}

// Export a proxy that throws a helpful error if pool is not initialized
const dbProxy = new Proxy({}, {
  get: function(target, prop) {
    if (!pool) {
      throw new Error('Database pool is not initialized. Check your database connection settings.');
    }
    if (prop === 'pool') {
      return pool;
    }
    if (typeof pool[prop] === 'function') {
      return pool[prop].bind(pool);
    }
    return pool[prop];
  }
});

module.exports = dbProxy;