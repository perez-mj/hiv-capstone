// backend/migrations/20260101000003-create-scheduling-tables.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const S = Sequelize;
    const id = { type: S.INTEGER, primaryKey: true, autoIncrement: true };
    const ts = {
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    };

    // ---------- appointments ----------
    await queryInterface.createTable('appointments', {
      id,
      patient_id: {
        type: S.INTEGER, allowNull: false,
        references: { model: 'patients', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      transaction_type_id: {
        type: S.INTEGER, allowNull: false,
        references: { model: 'transaction_types', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      office: { type: S.STRING(20), allowNull: false },
      appointment_date: { type: S.DATEONLY, allowNull: false },
      time_slot:        { type: S.TIME, allowNull: false },
      status: {
        type: S.ENUM('pending', 'queued', 'completed', 'cancelled', 'no-show'),
        defaultValue: 'pending',
      },
      queue_number:        { type: S.STRING(20), allowNull: true },
      cancellation_reason: { type: S.TEXT, allowNull: true },
      notes:               { type: S.TEXT, allowNull: true },
      queued_at:       { type: S.DATE, allowNull: true },
      completed_at:        { type: S.DATE, allowNull: true },
      ...ts,
    });
    await queryInterface.addIndex('appointments', ['patient_id', 'appointment_date']);
    await queryInterface.addIndex('appointments', ['office', 'appointment_date', 'status']);

    // ---------- queues ----------
    await queryInterface.createTable('queues', {
      id,
      office: { type: S.STRING(20), allowNull: false },
      date:   { type: S.DATEONLY, allowNull: false },
      current_number:  { type: S.INTEGER, defaultValue: 0 },
      completed_count: { type: S.INTEGER, defaultValue: 0 },
      skipped_count:   { type: S.INTEGER, defaultValue: 0 },
      noshow_count:    { type: S.INTEGER, defaultValue: 0 },
      total_wait_time_minutes:   { type: S.INTEGER, defaultValue: 0 },
      average_wait_time_minutes: { type: S.FLOAT, defaultValue: 0 },
      ...ts,
    });
    // NOT unique in the model
    await queryInterface.addIndex('queues', ['office', 'date']);

    // ---------- queue_entries ----------
    await queryInterface.createTable('queue_entries', {
      id,
      queue_id: {
        type: S.INTEGER, allowNull: false,
        references: { model: 'queues', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      patient_id: {
        type: S.INTEGER, allowNull: false,
        references: { model: 'patients', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      appointment_id: {
        type: S.INTEGER, allowNull: true,
        references: { model: 'appointments', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      transaction_type_id: {
        type: S.INTEGER, allowNull: false,
        references: { model: 'transaction_types', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      },
      queue_number: { type: S.STRING(20), allowNull: false },
      position:     { type: S.INTEGER, allowNull: false },
      status: {
        type: S.ENUM('waiting', 'in-progress', 'completed', 'skipped', 'no-show'),
        defaultValue: 'waiting',
      },
      estimated_duration_minutes: { type: S.INTEGER, allowNull: false },
      called_at:    { type: S.DATE, allowNull: true },
      started_at:   { type: S.DATE, allowNull: true },
      completed_at: { type: S.DATE, allowNull: true },
      skip_reason:  { type: S.TEXT, allowNull: true },
      ...ts,
    });
    await queryInterface.addIndex('queue_entries', ['queue_id', 'status']);
    await queryInterface.addIndex('queue_entries', ['queue_id', 'position']);
    await queryInterface.addIndex('queue_entries', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('queue_entries');
    await queryInterface.dropTable('queues');
    await queryInterface.dropTable('appointments');
  },
};