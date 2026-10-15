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

    // ---------- transaction_types ----------
    await queryInterface.createTable('transaction_types', {
      id,
      name: { type: S.STRING(50), allowNull: false, unique: true },
      office: {
        type: S.ENUM('testing', 'treatment'),
        allowNull: false,
      },
      estimated_duration_minutes: {
        type: S.INTEGER,
        allowNull: false,
      },
      description: { type: S.TEXT, allowNull: true },
      is_active: { type: S.BOOLEAN, defaultValue: true },
      color_code: { type: S.STRING(7), allowNull: true },
      ...ts,
    });
    await queryInterface.addIndex('transaction_types', ['office']);
    await queryInterface.addIndex('transaction_types', ['is_active']);

    // ---------- encounters (unified) ----------
    await queryInterface.createTable('encounters', {
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
      office: {
        type: S.ENUM('testing', 'treatment'),
        allowNull: false,
      },
      transaction_type_id: {
        type: S.INTEGER, allowNull: false,
        references: { model: 'transaction_types', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      data: { type: S.JSON, allowNull: false },
      notes: { type: S.TEXT, allowNull: true },
      occurred_at: {
        type: S.DATE, allowNull: false,
        defaultValue: S.literal('CURRENT_TIMESTAMP'),
      },
      voided_at: { type: S.DATE, allowNull: true },
      voided_by: {
        type: S.INTEGER, allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      void_reason: { type: S.TEXT, allowNull: true },
      ...ts,
    });
    await queryInterface.addIndex('encounters', ['patient_id', 'occurred_at']);
    await queryInterface.addIndex('encounters', ['transaction_type_id']);
    await queryInterface.addIndex('encounters', ['office']);
    await queryInterface.addIndex('encounters', ['staff_id']);
    await queryInterface.addIndex('encounters', ['voided_at']);

    // ---------- audit_logs ----------
    await queryInterface.createTable('audit_logs', {
      id,
      user_id: {
        type: S.INTEGER, allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      encounter_id: {
        type: S.INTEGER, allowNull: true,
        references: { model: 'encounters', key: 'id' },
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
    await queryInterface.addIndex('audit_logs', ['encounter_id']);
    await queryInterface.addIndex('audit_logs', ['entity_type', 'entity_id']);
    await queryInterface.addIndex('audit_logs', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('audit_logs');
    await queryInterface.dropTable('encounters');
    await queryInterface.dropTable('transaction_types');
  },
};