// backend/config/config.js
// Sequelize CLI reads this. It wraps the app's existing config/database.js
// so we only maintain DB credentials in one place.
const db = require('./database');

const base = {
  username: db.username,
  password: db.password,
  database: db.database,
  host: db.host,
  port: db.port,
  dialect: db.dialect,
  pool: db.pool,
  define: { underscored: true, timestamps: true },
};

module.exports = {
  development: { ...base, logging: console.log },
  test: { ...base, logging: false },
  production: {
    ...base,
    logging: false,
    dialectOptions:
      process.env.DB_SSL === 'true'
        ? { ssl: { rejectUnauthorized: true } }
        : {},
  },
};