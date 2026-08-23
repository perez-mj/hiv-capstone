// backend/models/QueueEntry.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const QueueEntry = sequelize.define('QueueEntry', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    queue_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'queues',
        key: 'id'
      }
    },
    patient_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'patients',
        key: 'id'
      }
    },
    appointment_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'appointments',
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
    queue_number: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('waiting', 'in-progress', 'completed', 'skipped', 'no-show'),
      defaultValue: 'waiting'
    },
    estimated_duration_minutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Copied from transaction_type for historical accuracy'
    },
    called_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    skip_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'queue_entries',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['queue_id', 'status'] },
      { fields: ['queue_id', 'position'] },
      { fields: ['status'] }
    ]
  });

  QueueEntry.associate = (models) => {
    QueueEntry.belongsTo(models.Queue, { 
      foreignKey: 'queue_id',
      as: 'Queue' 
    });
    QueueEntry.belongsTo(models.Patient, { 
      foreignKey: 'patient_id',
      as: 'Patient' 
    });
    QueueEntry.belongsTo(models.Appointment, { 
      foreignKey: 'appointment_id',
      as: 'Appointment' 
    });
    QueueEntry.belongsTo(models.TransactionType, { 
      foreignKey: 'transaction_type_id',
      as: 'TransactionType' 
    });
  };

  return QueueEntry;
};