// backend/models/TransactionType.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TransactionType = sequelize.define('TransactionType', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    office: {
      type: DataTypes.ENUM('testing', 'treatment'),
      allowNull: false,
    },
    estimated_duration_minutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 5, max: 120 },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    color_code: {
      type: DataTypes.STRING(7),
      allowNull: true,
      validate: { is: /^#[0-9A-F]{6}$/i },
    },
    checklist_schema: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { fields: [] },
    },
    schema_version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  }, {
    tableName: 'transaction_types',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['name', 'office'],
        name: 'unique_name_per_office',
      },
    ],
  });

  TransactionType.associate = (models) => {
    TransactionType.hasMany(models.Appointment, { foreignKey: 'transaction_type_id' });
    TransactionType.hasMany(models.QueueEntry, { foreignKey: 'transaction_type_id' });
    TransactionType.hasMany(models.Encounter, { foreignKey: 'transaction_type_id' }); // ← NEW
  };

  return TransactionType;
};