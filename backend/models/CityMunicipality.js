// backend/models/CityMunicipality.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CityMunicipality = sequelize.define('CityMunicipality', {
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
    regionId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'region_id',
    },
    // Nullable because NCR and independent/HUC cities can have no province.
    provinceId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'province_id',
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    geographicLevel: {
      type: DataTypes.ENUM('City', 'Municipality'),
      allowNull: false,
      field: 'geographic_level',
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
    cityClass: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'city_class',
    },
    incomeClassification: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'income_classification',
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
    tableName: 'cities_municipalities',
    timestamps: true,
  });

  CityMunicipality.associate = (models) => {
    CityMunicipality.belongsTo(models.Region, {
      foreignKey: 'regionId',
      as: 'region',
    });

    CityMunicipality.belongsTo(models.Province, {
      foreignKey: 'provinceId',
      as: 'province',
    });

    CityMunicipality.hasMany(models.Barangay, {
      foreignKey: 'cityMunicipalityId',
      as: 'barangays',
    });
  };

  return CityMunicipality;
};
