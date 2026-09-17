// backend/migrations/20260101000002-create-clinical-tables.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const S = Sequelize;
    const id = { type: S.INTEGER, primaryKey: true, autoIncrement: true };
    const ts = {
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    };

    // ---------- testing_encounters ----------
    await queryInterface.createTable('testing_encounters', {
      id,
      patient_id: {
        type: S.INTEGER, allowNull: false,
        references: { model: 'patients', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      staff_id: {
        type: S.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      pretest_counseling: { type: S.JSON, allowNull: true },
      hiv_test:           { type: S.JSON, allowNull: true },
      posttest_counseling:{ type: S.JSON, allowNull: true },
      referral:           { type: S.JSON, allowNull: true },
      ...ts,
    });
    await queryInterface.addIndex('testing_encounters', ['patient_id']);
    await queryInterface.addIndex('testing_encounters', ['staff_id']);

    // ---------- treatment_encounters ----------
    await queryInterface.createTable('treatment_encounters', {
      id,
      patient_id: {
        type: S.INTEGER, allowNull: false,
        references: { model: 'patients', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      staff_id: {
        type: S.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      consultation_notes: { type: S.JSON, allowNull: true },
      art_prescription:   { type: S.JSON, allowNull: true },
      lab_results:        { type: S.JSON, allowNull: true },
      adherence:          { type: S.JSON, allowNull: true },
      next_appointment_date: { type: S.DATEONLY, allowNull: true },
      ...ts,
    });
    await queryInterface.addIndex('treatment_encounters', ['patient_id']);
    await queryInterface.addIndex('treatment_encounters', ['staff_id']);

    // ---------- audit_logs ----------
    await queryInterface.createTable('audit_logs', {
      id,
      user_id: {
        type: S.INTEGER, allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      action:       { type: S.STRING(50), allowNull: false },
      entity_type:  { type: S.STRING(50), allowNull: false },
      entity_id:    { type: S.STRING(128), allowNull: true },
      old_data:     { type: S.JSON, allowNull: true },
      new_data:     { type: S.JSON, allowNull: true },
      request_data: { type: S.JSON, allowNull: true },
      ip_address:   { type: S.STRING(45), allowNull: true },
      user_agent:   { type: S.STRING(255), allowNull: true },
      duration_ms:  { type: S.INTEGER, allowNull: true },
      status_code:  { type: S.INTEGER, allowNull: true },
      ...ts,
    });
    await queryInterface.addIndex('audit_logs', ['user_id']);
    await queryInterface.addIndex('audit_logs', ['entity_type', 'entity_id']);
    await queryInterface.addIndex('audit_logs', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('audit_logs');
    await queryInterface.dropTable('treatment_encounters');
    await queryInterface.dropTable('testing_encounters');
  },
};