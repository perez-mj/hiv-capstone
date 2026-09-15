'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const S = Sequelize;
    const id = { type: S.INTEGER, primaryKey: true, autoIncrement: true };
    const ts = {
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    };

    // ---------- users ----------
    await queryInterface.createTable('users', {
      id,
      username: { type: S.STRING(50), allowNull: false, unique: true },
      email:    { type: S.STRING(100), allowNull: false, unique: true },
      password_hash: { type: S.STRING(255), allowNull: false },
      role:     { type: S.ENUM('patient', 'staff', 'admin'), allowNull: false, defaultValue: 'patient' },
      office:   { type: S.STRING(20), allowNull: true, defaultValue: null },
      is_active:{ type: S.BOOLEAN, defaultValue: true },
      last_login: { type: S.DATE, allowNull: true },
      ...ts,
    });
    await queryInterface.addIndex('users', ['role']);
    await queryInterface.addIndex('users', ['is_active']);
    await queryInterface.addIndex('users', ['office']);

    // ---------- patients (encrypted PII) ----------
    await queryInterface.createTable('patients', {
      id,
      user_id: {
        type: S.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      // encrypted PII + companion hashes
      first_name:      { type: S.TEXT, allowNull: false },
      first_name_hash: { type: S.STRING(64), allowNull: true },

      middle_name:      { type: S.TEXT, allowNull: true },
      middle_name_hash: { type: S.STRING(64), allowNull: true },

      last_name:      { type: S.TEXT, allowNull: false },
      last_name_hash: { type: S.STRING(64), allowNull: true },

      birth_date:      { type: S.TEXT, allowNull: false },
      birth_date_hash: { type: S.STRING(64), allowNull: true },

      gender:      { type: S.TEXT, allowNull: false },
      gender_hash: { type: S.STRING(64), allowNull: true },

      contact_number:      { type: S.TEXT, allowNull: false },
      contact_number_hash: { type: S.STRING(64), allowNull: false, unique: true },

      address: { type: S.TEXT, allowNull: true },

      status:      { type: S.TEXT, allowNull: true },
      status_hash: { type: S.STRING(64), allowNull: true },

      patient_facility_code: { type: S.STRING(50), allowNull: false, unique: true },

      emergency_contact: { type: S.TEXT, allowNull: true },
      emergency_phone:      { type: S.TEXT, allowNull: true },
      emergency_phone_hash: { type: S.STRING(64), allowNull: true },
      guardian_name:    { type: S.TEXT, allowNull: true },
      guardian_contact: { type: S.TEXT, allowNull: true },

      enrollment_date:           { type: S.DATEONLY, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      treatment_transition_date: { type: S.DATEONLY, allowNull: true },

      ...ts,
    });
    await queryInterface.addIndex('patients', ['user_id']);
    await queryInterface.addIndex('patients', ['first_name_hash']);
    await queryInterface.addIndex('patients', ['middle_name_hash']);
    await queryInterface.addIndex('patients', ['last_name_hash']);
    await queryInterface.addIndex('patients', ['birth_date_hash']);
    await queryInterface.addIndex('patients', ['gender_hash']);
    await queryInterface.addIndex('patients', ['contact_number_hash'], { unique: true });
    await queryInterface.addIndex('patients', ['status_hash']);
    await queryInterface.addIndex('patients', ['emergency_phone_hash']);
    await queryInterface.addIndex('patients', ['patient_facility_code'], { unique: true });

    // ---------- refresh_tokens ----------
    await queryInterface.createTable('refresh_tokens', {
      id,
      token: { type: S.STRING(255), allowNull: false, unique: true },
      user_id: {
        type: S.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      expires_at: { type: S.DATE, allowNull: false },
      revoked:    { type: S.BOOLEAN, defaultValue: false },
      ip_address: { type: S.STRING(45), allowNull: true },
      user_agent: { type: S.STRING(255), allowNull: true },
      ...ts,
    });
    await queryInterface.addIndex('refresh_tokens', ['token'], { unique: true });
    await queryInterface.addIndex('refresh_tokens', ['user_id']);
    await queryInterface.addIndex('refresh_tokens', ['expires_at']);
    await queryInterface.addIndex('refresh_tokens', ['revoked']);

    // ---------- system_settings ----------
    await queryInterface.createTable('system_settings', {
      id,
      key:         { type: S.STRING(100), allowNull: false, unique: true },
      value:       { type: S.TEXT, allowNull: false },
      description: { type: S.TEXT, allowNull: true },
      data_type:   { type: S.STRING(20), defaultValue: 'string' },
      category:    { type: S.STRING(50), allowNull: true },
      ...ts,
    });

    // ---------- appointment_settings ----------
    await queryInterface.createTable('appointment_settings', {
      id,
      office: { type: S.STRING(20), allowNull: true, defaultValue: null },
      start_time: { type: S.TIME, allowNull: false, defaultValue: '08:00:00' },
      end_time:   { type: S.TIME, allowNull: false, defaultValue: '17:00:00' },
      slot_duration_minutes: { type: S.INTEGER, allowNull: false, defaultValue: 30 },
      max_capacity_per_slot: { type: S.INTEGER, allowNull: false, defaultValue: 5 },
      lunch_start: { type: S.TIME, allowNull: false, defaultValue: '12:00:00' },
      lunch_end:   { type: S.TIME, allowNull: false, defaultValue: '13:00:00' },
      daily_capacity: { type: S.INTEGER, allowNull: false, defaultValue: 20 },
      working_days: { type: S.JSON, allowNull: false, defaultValue: JSON.stringify(['mon','tue','wed','thu','fri']) },
      holidays:     { type: S.JSON, allowNull: false, defaultValue: JSON.stringify([]) },
      advance_booking_days:      { type: S.INTEGER, allowNull: false, defaultValue: 30 },
      booking_lead_time_minutes: { type: S.INTEGER, allowNull: false, defaultValue: 60 },
      max_appointments_per_patient_per_day: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
      allow_online_booking:      { type: S.BOOLEAN, allowNull: false, defaultValue: true },
      allow_online_cancellation: { type: S.BOOLEAN, allowNull: false, defaultValue: true },
      cancellation_deadline_hours: { type: S.INTEGER, allowNull: false, defaultValue: 24 },
      is_active: { type: S.BOOLEAN, allowNull: false, defaultValue: true },
      ...ts,
    });
    await queryInterface.addIndex('appointment_settings', ['is_active']);
    // Partial unique index on office WHERE office IS NOT NULL — DB-specific.
    // MySQL 8+:
    if (queryInterface.sequelize.getDialect() === 'mysql') {
      await queryInterface.sequelize.query(
        "CREATE UNIQUE INDEX unique_office_settings ON appointment_settings (office) WHERE office IS NOT NULL"
      );
    } else {
      await queryInterface.addIndex('appointment_settings', ['office'], {
        name: 'unique_office_settings',
        unique: true,
        where: { office: { [S.Op.ne]: null } },
      });
    }

    // ---------- transaction_types (paranoid) ----------
    await queryInterface.createTable('transaction_types', {
      id,
      name:   { type: S.STRING(50), allowNull: false, unique: true },
      office: { type: S.ENUM('testing', 'treatment'), allowNull: false },
      estimated_duration_minutes: { type: S.INTEGER, allowNull: false },
      description: { type: S.TEXT, allowNull: true },
      is_active:   { type: S.BOOLEAN, defaultValue: true },
      color_code:  { type: S.STRING(7), allowNull: true },
      ...ts,
      deleted_at:  { type: S.DATE, allowNull: true },
    });
    await queryInterface.addIndex('transaction_types', ['office']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('transaction_types');
    await queryInterface.dropTable('appointment_settings');
    await queryInterface.dropTable('system_settings');
    await queryInterface.dropTable('refresh_tokens');
    await queryInterface.dropTable('patients');
    await queryInterface.dropTable('users');
  },
};