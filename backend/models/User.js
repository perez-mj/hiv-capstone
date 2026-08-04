// backend/models/User.js
const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('patient', 'staff', 'admin'),
      allowNull: false,
      defaultValue: 'patient'
    },
    office: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['role'] },
      { fields: ['is_active'] },
      { fields: ['office'] }
    ]
  });

  // Instance method to validate password
  User.prototype.validatePassword = async function(password) {
    if (!password || !this.password_hash) {
      return false;
    }
    try {
      return await bcrypt.compare(password, this.password_hash);
    } catch (error) {
      console.error('Error validating password:', error);
      return false;
    }
  };

  // Static method to find by credentials
  User.findByCredentials = async function(username, password) {
    const user = await this.findOne({ where: { username } });
    if (!user) {
      return null;
    }
    const isValid = await user.validatePassword(password);
    if (!isValid) {
      return null;
    }
    return user;
  };

  // Hooks
  const hashPassword = async (user) => {
    if (user.password_hash) {
      const salt = await bcrypt.genSalt(10);
      user.password_hash = await bcrypt.hash(user.password_hash, salt);
    }
  };

  User.beforeCreate(hashPassword);
  User.beforeUpdate(async (user) => {
    if (user.changed('password_hash')) {
      await hashPassword(user);
    }
  });

User.associate = function(models) {
  // User has one Patient
  User.hasOne(models.Patient, {
    foreignKey: 'user_id',
    as: 'Patient'
  });
  
  // User has many AuditLogs - ADD THIS
  User.hasMany(models.AuditLog, {
    foreignKey: 'user_id',
    as: 'AuditLogs'
  });
  
  // User has many TestingEncounters (as staff)
  User.hasMany(models.TestingEncounter, {
    foreignKey: 'staff_id',
    as: 'TestingEncounters'
  });
  
  // User has many TreatmentEncounters (as staff)
  User.hasMany(models.TreatmentEncounter, {
    foreignKey: 'staff_id',
    as: 'TreatmentEncounters'
  });
};

  return User;
};