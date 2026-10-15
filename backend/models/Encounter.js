// backend/models/Encounter.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Encounter = sequelize.define('Encounter', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    patient_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'patients', key: 'id' }
    },
    staff_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    office: {
      type: DataTypes.ENUM('testing', 'treatment'),
      allowNull: false,
    },
    // Replaces the hardcoded enum — references transaction_types
    transaction_type_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'transaction_types', key: 'id' }
    },
    // Flexible structured payload — schema differs per transaction type
    // Validated in the service layer before persist
    data: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {}
    },
    notes: {
      type: DataTypes.TEXT
    },
    occurred_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    // Soft delete / voiding (never hard-delete clinical data)
    voided_at: {
      type: DataTypes.DATE
    },
    voided_by: {
      type: DataTypes.INTEGER,
      references: { model: 'users', key: 'id' }
    },
    void_reason: {
      type: DataTypes.TEXT
    },
  }, {
    tableName: 'encounters',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['patient_id', 'occurred_at'] },
      { fields: ['transaction_type_id'] },
      { fields: ['office'] },
      { fields: ['staff_id'] },
      { fields: ['voided_at'] },
    ],
  });

  // ---------- ASSOCIATIONS ----------
  Encounter.associate = (models) => {
    Encounter.belongsTo(models.Patient, {
      foreignKey: 'patient_id',
      as: 'Patient'
    });
    Encounter.belongsTo(models.User, {
      foreignKey: 'staff_id',
      as: 'Staff'
    });
    Encounter.belongsTo(models.User, {
      foreignKey: 'voided_by',
      as: 'Voider'
    });
    Encounter.belongsTo(models.TransactionType, {
      foreignKey: 'transaction_type_id',
      as: 'TransactionType'
    });
  };

  return Encounter;
};