// backend/migrations/20251231000000-create-location-tables.js

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('regions', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      psgc_code: {
        type: Sequelize.STRING(10),
        allowNull: false,
        unique: true,
      },
      name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      correspondence_code: {
        type: Sequelize.STRING(9),
        allowNull: true,
      },
      old_names: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.createTable('provinces', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      psgc_code: {
        type: Sequelize.STRING(10),
        allowNull: false,
        unique: true,
      },
      region_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'regions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      correspondence_code: {
        type: Sequelize.STRING(9),
        allowNull: true,
      },
      old_names: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      income_classification: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.createTable('cities_municipalities', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      psgc_code: {
        type: Sequelize.STRING(10),
        allowNull: false,
        unique: true,
      },
      region_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'regions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      province_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'provinces', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      geographic_level: {
        type: Sequelize.ENUM('City', 'Municipality'),
        allowNull: false,
      },
      correspondence_code: {
        type: Sequelize.STRING(9),
        allowNull: true,
      },
      old_names: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      city_class: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      income_classification: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      urban_rural: {
        type: Sequelize.STRING(1),
        allowNull: true,
      },
      population_2024: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.createTable('barangays', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      psgc_code: {
        type: Sequelize.STRING(10),
        allowNull: false,
        unique: true,
      },
      city_municipality_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'cities_municipalities', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      correspondence_code: {
        type: Sequelize.STRING(9),
        allowNull: true,
      },
      old_names: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      urban_rural: {
        type: Sequelize.STRING(1),
        allowNull: true,
      },
      population_2024: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('regions', ['name']);
    await queryInterface.addIndex('provinces', ['region_id', 'name']);
    await queryInterface.addIndex('cities_municipalities', ['region_id', 'name']);
    await queryInterface.addIndex('cities_municipalities', ['province_id', 'name']);
    await queryInterface.addIndex('barangays', ['city_municipality_id', 'name']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('barangays');
    await queryInterface.dropTable('cities_municipalities');
    await queryInterface.dropTable('provinces');
    await queryInterface.dropTable('regions');
  },
};
