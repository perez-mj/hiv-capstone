// backend/models/Barangay.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Barangay = sequelize.define('Barangay', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    psgcCode: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
      field: 'psgc_code',
    },
    cityMunicipalityId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'city_municipality_id',
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    correspondenceCode: {
      type: DataTypes.STRING(9),
      allowNull: true,
      field: 'correspondence_code',
    },
    oldNames: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'old_names',
    },
    urbanRural: {
      type: DataTypes.STRING(1),
      allowNull: true,
      field: 'urban_rural',
    },
    population2024: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'population_2024',
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
  }, {
    tableName: 'barangays',
    timestamps: true,
  });

  Barangay.associate = (models) => {
    Barangay.belongsTo(models.CityMunicipality, {
      foreignKey: 'cityMunicipalityId',
      as: 'cityMunicipality',
    });
  };

  return Barangay;
};
