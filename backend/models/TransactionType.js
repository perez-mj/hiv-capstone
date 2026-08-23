// backend/models/TransactionType.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TransactionType = sequelize.define('TransactionType', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    office: {
      type: DataTypes.ENUM('testing', 'treatment'),
      allowNull: false
    },
    estimated_duration_minutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 5,
        max: 120
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    color_code: {
      type: DataTypes.STRING(7),
      allowNull: true,
      validate: {
        is: /^#[0-9A-F]{6}$/i
      }
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'transaction_types',
    timestamps: true,
    underscored: true,
    paranoid: true // Soft delete
  });

  TransactionType.associate = (models) => {
    TransactionType.hasMany(models.Appointment, { 
      foreignKey: 'transaction_type_id' 
    });
    TransactionType.hasMany(models.QueueEntry, { 
      foreignKey: 'transaction_type_id' 
    });
  };

  return TransactionType;
};