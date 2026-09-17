// backend/models/AuditLog.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' }
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    entity_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    // Widened from STRING(50) -> STRING(128).
    // Must fit:
    //   - 64-char MultiChain txids
    //   - compound keys like "patient.create:42" or "testing.create:1001"
    //   - batch identifiers like "batch-1789606731234"
    entity_id: {
      type: DataTypes.STRING(128),
      allowNull: true
    },
    old_data: {
      type: DataTypes.JSON,
      allowNull: true
    },
    new_data: {
      type: DataTypes.JSON,
      allowNull: true
    },
    request_data: {
      type: DataTypes.JSON,
      allowNull: true
    },
    ip_address: {
      type: DataTypes.STRING(45),   // IPv6-safe
      allowNull: true
    },
    user_agent: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    duration_ms: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    status_code: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'audit_logs',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['entity_type', 'entity_id'] },
      { fields: ['created_at'] }
    ]
  });

  AuditLog.associate = function (models) {
    AuditLog.belongsTo(models.User, { foreignKey: 'user_id', as: 'User' });
  };

  return AuditLog;
};