// backend/models/Region.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Province = sequelize.define('Province', {
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
    incomeClassification: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'income_classification',
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
  }, {
    tableName: 'provinces',
    timestamps: true,
  });

  Province.associate = (models) => {
    Province.belongsTo(models.Region, {
      foreignKey: 'regionId',
      as: 'region',
    });

    Province.hasMany(models.CityMunicipality, {
      foreignKey: 'provinceId',
      as: 'citiesMunicipalities',
    });
  };

  return Province;
};
