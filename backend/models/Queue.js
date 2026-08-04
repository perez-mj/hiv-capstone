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
    }
  }, {
    tableName: 'queues',
    timestamps: true,
    underscored: true,
    // FIXED: Remove duplicate indexes - only define composite index
    indexes: [
      { fields: ['office', 'date'] } // Composite index for common queries
    ]
  });

  Queue.associate = (models) => {
    Queue.hasMany(models.QueueEntry, { 
      foreignKey: 'queue_id',
      as: 'QueueEntries' 
    });
  };

  return Queue;
};