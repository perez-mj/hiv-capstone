// backend/config/config.js
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
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, 
    },
  },
},
};