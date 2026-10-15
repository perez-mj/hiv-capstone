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

// ---------- MODEL REGISTRATION ----------
db.User = require('./User')(sequelize);
db.SystemSetting = require('./SystemSetting')(sequelize);
db.AppointmentSetting = require('./AppointmentSetting')(sequelize);
db.RefreshToken = require('./RefreshToken')(sequelize);
db.AuditLog = require('./AuditLog')(sequelize);
db.Patient = require('./Patient')(sequelize);
db.TransactionType = require('./TransactionType')(sequelize);
db.Encounter = require('./Encounter')(sequelize);
db.Appointment = require('./Appointment')(sequelize);
db.Queue = require('./Queue')(sequelize);
db.QueueEntry = require('./QueueEntry')(sequelize);

db.Region = require('./Region')(sequelize);
db.Province = require('./Province')(sequelize);
db.CityMunicipality = require('./CityMunicipality')(sequelize);
db.Barangay = require('./Barangay')(sequelize);


// ---------- ASSOCIATIONS ----------
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;