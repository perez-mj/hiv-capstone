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
      type: DataTypes.STRING(45),
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

  AuditLog.forEntity = function (entityType, entityId) {
    return this.findAll({
      where: { entity_type: entityType, entity_id: String(entityId) },
      order: [['created_at', 'DESC']]
    });
  };

  return AuditLog;
};