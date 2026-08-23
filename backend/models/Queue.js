// backend/models/Queue.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Queue = sequelize.define('Queue', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    office: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    current_number: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    completed_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    skipped_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    noshow_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    total_wait_time_minutes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Cumulative wait time for all patients today'
    },
    average_wait_time_minutes: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      comment: 'Average wait time for today'
    }
  }, {
    tableName: 'queues',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['office', 'date'] }
    ]
  });

  Queue.associate = (models) => {
    Queue.hasMany(models.QueueEntry, { 
      foreignKey: 'queue_id',
      as: 'QueueEntries' 
    });
  };

  // Instance method to calculate wait time
  Queue.prototype.calculateWaitTime = function(queueEntries) {
    if (!queueEntries || queueEntries.length === 0) return 0;
    
    let totalWait = 0;
    let waitTime = 0;
    
    for (const entry of queueEntries) {
      if (entry.status === 'waiting' || entry.status === 'in-progress') {
        waitTime += entry.estimated_duration_minutes || 15;
      }
    }
    
    return waitTime;
  };

  return Queue;
};