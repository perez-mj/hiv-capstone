// backend/models/dlt-hash.js
const { DataTypes } = require('sequelize');
const sequelize = require('./db'); // Your Sequelize instance

const DltHash = sequelize.define('DltHash', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  patientId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  dataHash: {
    type: DataTypes.STRING(64),
    allowNull: false
  },
  transactionId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'dlt_hashes',
  timestamps: false
});

module.exports = DltHash;