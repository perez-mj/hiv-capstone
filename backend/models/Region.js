// backend/models/Region.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Region = sequelize.define('Region', {
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
    status: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
  }, {
    tableName: 'regions',
    timestamps: true,
  });

  Region.associate = (models) => {
    Region.hasMany(models.Province, {
      foreignKey: 'regionId',
      as: 'provinces',
    });

    Region.hasMany(models.CityMunicipality, {
      foreignKey: 'regionId',
      as: 'citiesMunicipalities',
    });
  };

  return Region;
};
