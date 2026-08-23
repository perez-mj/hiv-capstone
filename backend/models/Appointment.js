// backend/models/Appointment.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Appointment = sequelize.define('Appointment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    patient_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'patients',
        key: 'id'
      }
    },
    transaction_type_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'transaction_types',
        key: 'id'
      }
    },
    office: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    appointment_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    time_slot: {
      type: DataTypes.TIME,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'checked-in', 'completed', 'cancelled', 'no-show'),
      defaultValue: 'pending'
    },
    queue_number: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    cancellation_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    checked_in_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'appointments',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['patient_id', 'appointment_date'] },
      { fields: ['office', 'appointment_date', 'status'] }
    ]
  });

  Appointment.associate = (models) => {
    Appointment.belongsTo(models.Patient, { 
      foreignKey: 'patient_id',
      as: 'Patient' 
    });
    Appointment.belongsTo(models.TransactionType, { 
      foreignKey: 'transaction_type_id',
      as: 'TransactionType' 
    });
    Appointment.hasOne(models.QueueEntry, { 
      foreignKey: 'appointment_id',
      as: 'QueueEntry' 
    });
  };

  return Appointment;
};