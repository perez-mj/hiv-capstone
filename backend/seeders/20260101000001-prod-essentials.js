// backend/seeders/20260101000001-prod-essentials.js
'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const pw = process.env.SEED_ADMIN_PASSWORD;
    const email = process.env.SEED_ADMIN_EMAIL;
    if (!pw || !email) {
      throw new Error('SEED_ADMIN_PASSWORD and SEED_ADMIN_EMAIL must be set');
    }

    await queryInterface.bulkInsert('users', [{
      username: process.env.SEED_ADMIN_USERNAME || 'admin',
      email,
      password_hash: await bcrypt.hash(pw, 10),
      role: 'admin',
      office: null,
      is_active: true,
      created_at: now,
      updated_at: now,
    }]);

    await queryInterface.bulkInsert('system_settings', [
      { key: 'blockchain_enabled', value: 'false', data_type: 'boolean', category: 'security', created_at: now, updated_at: now },
      { key: 'max_login_attempts', value: '5', data_type: 'number', category: 'security', created_at: now, updated_at: now },
      { key: 'clinic_name', value: process.env.CLINIC_NAME || 'HIV Care Center', data_type: 'string', category: 'appearance', created_at: now, updated_at: now },
      { key: 'timezone', value: 'Asia/Manila', data_type: 'string', category: 'appearance', created_at: now, updated_at: now },
      { key: 'default_art_refill_days', value: '30', data_type: 'number', category: 'clinical', created_at: now, updated_at: now },
      { key: 'default_next_appointment_days', value: '90', data_type: 'number', category: 'clinical', created_at: now, updated_at: now },
    ]);

    await queryInterface.bulkInsert('appointment_settings', [{
      office: null,
      start_time: '08:00:00',
      end_time: '17:00:00',
      slot_duration_minutes: 30,
      max_capacity_per_slot: 5,
      lunch_start: '12:00:00',
      lunch_end: '13:00:00',
      daily_capacity: 20,
      working_days: JSON.stringify(['mon','tue','wed','thu','fri']),
      holidays: JSON.stringify([]),
      advance_booking_days: 30,
      booking_lead_time_minutes: 60,
      max_appointments_per_patient_per_day: 1,
      allow_online_booking: true,
      allow_online_cancellation: true,
      cancellation_deadline_hours: 24,
      is_active: true,
      created_at: now,
      updated_at: now,
    }]);

    await queryInterface.bulkInsert('transaction_types', [
      { name: 'Testing',      office: 'testing',   estimated_duration_minutes: 30, color_code: '#4CAF50', is_active: true, created_at: now, updated_at: now },
      { name: 'Consultation', office: 'treatment', estimated_duration_minutes: 45, color_code: '#FF9800', is_active: true, created_at: now, updated_at: now },
      { name: 'Refill',       office: 'treatment', estimated_duration_minutes: 15, color_code: '#2196F3', is_active: true, created_at: now, updated_at: now },
      { name: 'Other',        office: 'treatment', estimated_duration_minutes: 20, color_code: '#9C27B0', is_active: true, created_at: now, updated_at: now },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('transaction_types', null);
    await queryInterface.bulkDelete('appointment_settings', { office: null });
    await queryInterface.bulkDelete('system_settings', null);
    await queryInterface.bulkDelete('users', { username: process.env.SEED_ADMIN_USERNAME || 'admin' });
  },
};