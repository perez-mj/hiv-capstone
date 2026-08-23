// backend/models/index.js
const { Sequelize } = require('sequelize');
const config = require('../config/database');

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    logging: false,
    pool: config.pool,
    define: {
      underscored: true,
      timestamps: true
    }
  }
);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.User = require('./User')(sequelize);
db.SystemSetting = require('./SystemSetting')(sequelize); // Keep for other settings
db.AppointmentSetting = require('./AppointmentSetting')(sequelize); // NEW
db.RefreshToken = require('./RefreshToken')(sequelize);
db.AuditLog = require('./AuditLog')(sequelize);
db.Patient = require('./Patient')(sequelize);
db.TransactionType = require('./TransactionType')(sequelize);
db.Appointment = require('./Appointment')(sequelize);
db.TestingEncounter = require('./TestingEncounter')(sequelize);
db.TreatmentEncounter = require('./TreatmentEncounter')(sequelize);
db.Queue = require('./Queue')(sequelize);
db.QueueEntry = require('./QueueEntry')(sequelize);

// Define associations after all models are loaded
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;