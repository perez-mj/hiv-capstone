// backend/seeders/20260101000001-prod-essentials.js
'use strict';
const bcrypt = require('bcryptjs');

// ── FIX ── helpers so re-runs after a partial failure don't blow up on
// duplicate-key, and so bulkInsert gets properly-serialized JSON.
const asJson = (obj) => JSON.stringify(obj);

const emptyChecklist = { fields: [] };

const TRANSACTION_TYPES = [
  {
    name: 'Testing',
    office: 'testing',
    estimated_duration_minutes: 30,
    color_code: '#4CAF50',
    is_active: true,
    checklist_schema: asJson({
      fields: [
        { key: 'test_type', label: 'Test Type', type: 'enum', required: true,
          options: ['HIV', 'Syphilis', 'Hepatitis B', 'Hepatitis C'] },
        { key: 'specimen', label: 'Specimen', type: 'enum', required: true,
          options: ['blood', 'urine', 'swab', 'other'] },
        { key: 'notes', label: 'Notes', type: 'textarea', required: false, maxLength: 1000 },
      ],
    }),
  },
  {
    name: 'Testing Result',
    office: 'testing',
    estimated_duration_minutes: 15,
    color_code: '#a0e999',
    is_active: true,
    checklist_schema: asJson({
      fields: [
        { key: 'result', label: 'Result', type: 'enum', required: true,
          options: ['negative', 'positive', 'inconclusive'] },
        { key: 'confirmed', label: 'Confirmed', type: 'boolean', required: true },
        { key: 'notes', label: 'Notes', type: 'textarea', required: false, maxLength: 1000 },
      ],
    }),
  },
  {
    name: 'Other',
    office: 'testing',
    estimated_duration_minutes: 20,
    color_code: '#82a785',
    is_active: true,
    checklist_schema: asJson({
      fields: [
        { key: 'notes', label: 'Notes', type: 'textarea', required: true, maxLength: 2000 },
      ],
    }),
  },
  {
    name: 'New - STI Consultation',
    office: 'treatment',
    estimated_duration_minutes: 35,
    color_code: '#ab65c7',
    is_active: true,
    checklist_schema: asJson({
      fields: [
        { key: 'symptoms', label: 'Symptoms', type: 'multiselect', required: false,
          options: ['discharge', 'pain', 'rash', 'fever', 'lesion'] },
        { key: 'diagnosis', label: 'Diagnosis', type: 'text', required: true, maxLength: 200 },
        { key: 'notes', label: 'Notes', type: 'textarea', required: false, maxLength: 2000 },
      ],
    }),
  },
  {
    name: 'Old - STI Consultation',
    office: 'treatment',
    estimated_duration_minutes: 30,
    color_code: '#80128f',
    is_active: true,
    checklist_schema: asJson({
      fields: [
        { key: 'followup_status', label: 'Follow-up Status', type: 'enum', required: true,
          options: ['improved', 'unchanged', 'worsened'] },
        { key: 'notes', label: 'Notes', type: 'textarea', required: false, maxLength: 2000 },
      ],
    }),
  },
  {
    name: 'Consultation',
    office: 'treatment',
    estimated_duration_minutes: 45,
    color_code: '#c76bfc',
    is_active: true,
    checklist_schema: asJson({
      fields: [
        { key: 'chief_complaint', label: 'Chief Complaint', type: 'textarea', required: true, maxLength: 500 },
        { key: 'assessment', label: 'Assessment', type: 'textarea', required: false, maxLength: 2000 },
        { key: 'plan', label: 'Plan', type: 'textarea', required: false, maxLength: 2000 },
      ],
    }),
  },
  {
    name: 'Refill',
    office: 'treatment',
    estimated_duration_minutes: 15,
    color_code: '#63497a',
    is_active: true,
    checklist_schema: asJson({
      fields: [
        { key: 'medication', label: 'Medication', type: 'text', required: true, maxLength: 200 },
        { key: 'quantity', label: 'Quantity', type: 'number', required: true, min: 1, max: 365 },
      ],
    }),
  },
  {
    name: 'Other',
    office: 'treatment',
    estimated_duration_minutes: 20,
    color_code: '#b0277b',
    is_active: true,
    checklist_schema: asJson({
      fields: [
        { key: 'notes', label: 'Notes', type: 'textarea', required: true, maxLength: 2000 },
      ],
    }),
  },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const pw = process.env.SEED_ADMIN_PASSWORD;
    const email = process.env.SEED_ADMIN_EMAIL;
    if (!pw || !email) {
      throw new Error('SEED_ADMIN_PASSWORD and SEED_ADMIN_EMAIL must be set');
    }

    const adminUsername = process.env.SEED_ADMIN_USERNAME || 'admin';

    // ── FIX ── idempotent users insert
    const [{ count: userCount }] = await queryInterface.sequelize.query(
      'SELECT COUNT(*) AS count FROM users WHERE username = :u',
      { replacements: { u: adminUsername }, type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    if (Number(userCount) === 0) {
      await queryInterface.bulkInsert('users', [{
        username: adminUsername,
        email,
        password_hash: await bcrypt.hash(pw, 10),
        role: 'admin',
        office: null,
        is_active: true,
        created_at: now,
        updated_at: now,
      }]);
    }

    // ── FIX ── idempotent system_settings insert (INSERT IGNORE semantics)
    const settingsRows = [
      { key: 'blockchain_enabled', value: 'false', data_type: 'boolean', category: 'security', created_at: now, updated_at: now },
      { key: 'clinic_name', value: process.env.CLINIC_NAME || 'HIV Care Center', data_type: 'string', category: 'appearance', created_at: now, updated_at: now },
    ];
    const existingKeys = await queryInterface.sequelize.query(
      "SELECT `key` FROM system_settings WHERE `key` IN (:keys)",
      { replacements: { keys: settingsRows.map(r => r.key) }, type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const existingKeySet = new Set(existingKeys.map(r => r.key));
    const newSettings = settingsRows.filter(r => !existingKeySet.has(r.key));
    if (newSettings.length) {
      await queryInterface.bulkInsert('system_settings', newSettings);
    }

    // ── FIX ── idempotent appointment_settings
    const [apptSetting] = await queryInterface.sequelize.query(
      'SELECT id FROM appointment_settings WHERE office IS NULL LIMIT 1',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    if (!apptSetting) {
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
    }

    // ── FIX ── transaction_types: every row now includes checklist_schema.
    // Unique key is (name, office) in the migration, so the two "Other"
    // rows (testing + treatment) coexist. Filter for idempotency on the
    // same composite key.
    const existingTT = await queryInterface.sequelize.query(
      'SELECT name, office FROM transaction_types',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const existingTTKey = new Set(existingTT.map(r => `${r.name}::${r.office}`));
    const newTT = TRANSACTION_TYPES
      .filter(t => !existingTTKey.has(`${t.name}::${t.office}`))
      .map(t => ({ ...t, created_at: now, updated_at: now }));

    if (newTT.length) {
      await queryInterface.bulkInsert('transaction_types', newTT);
    }
  },

  async down(queryInterface, Sequelize) {
    const Op = Sequelize.Op;

    // ── FIX ── scoped deletes so we don't nuke unrelated rows
    await queryInterface.bulkDelete('transaction_types', {
      name: { [Op.in]: ['Testing', 'Testing Result', 'Other', 'New - STI Consultation', 'Old - STI Consultation', 'Consultation', 'Refill'] },
      office: { [Op.in]: ['testing', 'treatment'] },
    });

    await queryInterface.bulkDelete('appointment_settings', { office: null });

    await queryInterface.bulkDelete('system_settings', {
      key: { [Op.in]: ['blockchain_enabled', 'clinic_name'] },
    });

    await queryInterface.bulkDelete('users', {
      username: process.env.SEED_ADMIN_USERNAME || 'admin',
    });
  },
};