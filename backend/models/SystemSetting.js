// backend/models/SystemSetting.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SystemSetting = sequelize.define('SystemSetting', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    data_type: {
      type: DataTypes.STRING(20),
      defaultValue: 'string'
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: true
    }
  }, {
    tableName: 'system_settings',
    timestamps: true,
    underscored: true
  });

  SystemSetting.prototype.getTypedValue = function() {
    switch(this.data_type) {
      case 'number':
        return Number(this.value);
      case 'boolean':
        return this.value === 'true' || this.value === true;
      case 'json':
        try {
          return JSON.parse(this.value);
        } catch {
          return this.value;
        }
      default:
        return this.value;
    }
  };

  return SystemSetting;
};