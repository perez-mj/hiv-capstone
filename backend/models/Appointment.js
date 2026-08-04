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
    type: {
      type: DataTypes.STRING(20),
      defaultValue: 'scheduled'
    },
    status: {
      type: DataTypes.STRING(20),
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
    }
  }, {
    tableName: 'appointments',
    timestamps: true,
    underscored: true
  });

  Appointment.associate = (models) => {
    Appointment.belongsTo(models.Patient, { foreignKey: 'patient_id' });
    Appointment.hasOne(models.QueueEntry, { foreignKey: 'appointment_id' });
  };

  return Appointment;
};