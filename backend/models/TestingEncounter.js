// backend/models/TestingEncounter.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TestingEncounter = sequelize.define('TestingEncounter', {
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
    staff_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    pretest_counseling: {
      type: DataTypes.JSON,
      allowNull: true
    },
    hiv_test: {
      type: DataTypes.JSON,
      allowNull: true
    },
    posttest_counseling: {
      type: DataTypes.JSON,
      allowNull: true
    },
    referral: {
      type: DataTypes.JSON,
      allowNull: true
    },
    blockchain_hash: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    tableName: 'testing_encounters',
    timestamps: true,
    underscored: true
  });

  TestingEncounter.associate = (models) => {
    TestingEncounter.belongsTo(models.Patient, { foreignKey: 'patient_id' });
    TestingEncounter.belongsTo(models.User, { foreignKey: 'staff_id' });
  };

  return TestingEncounter;
};