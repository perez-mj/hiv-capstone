// backend/models/TreatmentEncounter.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TreatmentEncounter = sequelize.define('TreatmentEncounter', {
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
    consultation_notes: {
      type: DataTypes.JSON,
      allowNull: true
    },
    art_prescription: {
      type: DataTypes.JSON,
      allowNull: true
    },
    lab_results: {
      type: DataTypes.JSON,
      allowNull: true
    },
    adherence: {
      type: DataTypes.JSON,
      allowNull: true
    },
    next_appointment_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    blockchain_hash: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    tableName: 'treatment_encounters',
    timestamps: true,
    underscored: true
  });

  TreatmentEncounter.associate = (models) => {
    TreatmentEncounter.belongsTo(models.Patient, { foreignKey: 'patient_id' });
    TreatmentEncounter.belongsTo(models.User, { foreignKey: 'staff_id' });
  };

  return TreatmentEncounter;
};