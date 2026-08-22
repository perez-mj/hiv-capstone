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

  // Instance method to get typed value
  SystemSetting.prototype.getTypedValue = function() {
    switch(this.data_type) {
      case 'number':
        return Number(this.value);
      case 'boolean':
        return this.value === 'true' || this.value === true || this.value === '1';
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

  // Class method to get all settings as an object
  SystemSetting.getSettingsObject = async function() {
    const settings = await this.findAll();
    const result = {};
    for (const setting of settings) {
      result[setting.key] = setting.getTypedValue();
    }
    return result;
  };

  // Class method to get settings by category
  SystemSetting.getByCategory = async function(category) {
    return await this.findAll({
      where: { category },
      order: [['key', 'ASC']]
    });
  };

  // Class method to get settings as categorized object
  SystemSetting.getCategorizedSettings = async function() {
    const settings = await this.findAll({
      order: [['category', 'ASC'], ['key', 'ASC']]
    });
    
    const categorized = {};
    for (const setting of settings) {
      const category = setting.category || 'uncategorized';
      if (!categorized[category]) {
        categorized[category] = {};
      }
      categorized[category][setting.key] = setting.getTypedValue();
    }
    return categorized;
  };

  // Class method to update multiple settings at once
  SystemSetting.updateMany = async function(updates) {
    const results = [];
    for (const [key, value] of Object.entries(updates)) {
      const setting = await this.findOne({ where: { key } });
      if (setting) {
        // Auto-detect data type from value
        let dataType = 'string';
        let stringValue = String(value);
        
        if (typeof value === 'boolean') {
          dataType = 'boolean';
          stringValue = String(value);
        } else if (typeof value === 'number') {
          dataType = 'number';
          stringValue = String(value);
        } else if (typeof value === 'object') {
          dataType = 'json';
          stringValue = JSON.stringify(value);
        }
        
        setting.value = stringValue;
        setting.data_type = dataType;
        await setting.save();
        results.push({ key, success: true });
      } else {
        results.push({ key, success: false, error: 'Setting not found' });
      }
    }
    return results;
  };

  return SystemSetting;
};