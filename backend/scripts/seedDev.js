// backend/scripts/seedDev.js
require('dotenv').config();
const db = require('../models');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { hmac } = require('../utils/crypto');
const patientCodeService = require('../services/patientCodeService');

/**
 * Dev seeder — safe to re-run.
 *
 * Differences from initDb.js:
 *   • Never drops tables (no sync({ force: true }))
 *   • Uses findOrCreate everywhere → idempotent
 *   • Fast: skips password validation, audit log spam, refresh tokens
 *   • Adds N random patients/appointments on each run (N from env)
 *
 * Usage:
 *   npm run seed:dev
 *   DEV_EXTRA_PATIENTS=20 npm run seed:dev
 */

class DevSeeder {
  constructor() {
    this.extraPatients = parseInt(process.env.DEV_EXTRA_PATIENTS || '5', 10);
    this.stats = {
      users: 0,
      patients: 0,
      appointments: 0,
      transactionTypes: 0,
      settings: 0,
      appointmentSettings: 0,
      queues: 0
    };
  }

  log(msg) { console.log(msg); }
  ok(msg)  { console.log(`  ✓ ${msg}`); }
  info(msg){ console.log(`  ℹ️ ${msg}`); }
  warn(msg){ console.log(`  ⚠️ ${msg}`); }

  // -------------------------------------------------------------------
  // SCHEMA — alter, don't destroy
  // -------------------------------------------------------------------
  async syncSchema() {
    this.log('\nSyncing schema (alter, no data loss)...');
    await db.sequelize.sync({ alter: false }); // set alter:true only if you know it's safe
    this.ok('Schema in sync');
  }

  // -------------------------------------------------------------------
  // SETTINGS
  // -------------------------------------------------------------------
  async seedSettings() {
    this.log('\nSeeding settings...');

    const systemSettings = [
      { key: 'blockchain_enabled', value: 'false', data_type: 'boolean', category: 'security', description: 'MultiChain logging' },
      { key: 'max_login_attempts', value: '5', data_type: 'number', category: 'security', description: 'Login attempt limit' },
      { key: 'clinic_name', value: process.env.CLINIC_NAME || 'Dev HIV Care Center', data_type: 'string', category: 'appearance', description: 'Clinic display name' },
      { key: 'timezone', value: 'Asia/Manila', data_type: 'string', category: 'appearance', description: 'Timezone' },
      { key: 'default_art_refill_days', value: '30', data_type: 'number', category: 'clinical', description: 'ART refill interval' },
      { key: 'default_next_appointment_days', value: '90', data_type: 'number', category: 'clinical', description: 'Follow-up interval' }
    ];

    for (const s of systemSettings) {
      const [, created] = await db.SystemSetting.findOrCreate({
        where: { key: s.key },
        defaults: s
      });
      if (created) this.stats.settings++;
    }
    this.ok(`${this.stats.settings} new system settings`);

    const [, apptCreated] = await db.AppointmentSetting.findOrCreate({
      where: { office: null },
      defaults: {
        office: null,
        start_time: '08:00:00',
        end_time: '17:00:00',
        slot_duration_minutes: 30,
        max_capacity_per_slot: 5,
        lunch_start: '12:00:00',
        lunch_end: '13:00:00',
        daily_capacity: 20,
        working_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
        holidays: [],
        advance_booking_days: 30,
        booking_lead_time_minutes: 60,
        max_appointments_per_patient_per_day: 1,
        allow_online_booking: true,
        allow_online_cancellation: true,
        cancellation_deadline_hours: 24,
        is_active: true
      }
    });
    if (apptCreated) this.stats.appointmentSettings++;
    this.ok(`${this.stats.appointmentSettings} new appointment settings`);
  }

  // -------------------------------------------------------------------
  // USERS
  // -------------------------------------------------------------------
  async seedUsers() {
    this.log('\nSeeding core users...');

    const users = [
      { username: 'admin',  email: 'admin@dev.local',        password: 'Admin@123',  role: 'admin', office: null },
      { username: 'nurse',  email: 'nurse@dev.local',        password: 'Nurse@123',  role: 'staff', office: 'testing' },
      { username: 'pharma', email: 'pharma@dev.local',       password: 'Pharma@123', role: 'staff', office: 'treatment' }
    ];

    for (const u of users) {
      const [user, created] = await db.User.findOrCreate({
        where: { username: u.username },
        defaults: {
          username: u.username,
          email: u.email,
          password_hash: await bcrypt.hash(u.password, 10),
          role: u.role,
          office: u.office,
          is_active: true
        }
      });
      if (created) {
        this.stats.users++;
        this.ok(`User: ${u.username} (${u.role}${u.office ? ' / ' + u.office : ''})`);
      } else {
        this.info(`User exists: ${u.username}`);
      }
    }
  }

  // -------------------------------------------------------------------
  // TRANSACTION TYPES
  // -------------------------------------------------------------------
  async seedTransactionTypes() {
    this.log('\nSeeding transaction types...');

    const types = [
      { name: 'Testing',      office: 'testing',   estimated_duration_minutes: 30, color_code: '#4CAF50', is_active: true },
      { name: 'Consultation', office: 'treatment', estimated_duration_minutes: 45, color_code: '#FF9800', is_active: true },
      { name: 'Refill',       office: 'treatment', estimated_duration_minutes: 15, color_code: '#2196F3', is_active: true },
      { name: 'Other',        office: 'treatment', estimated_duration_minutes: 20, color_code: '#9C27B0', is_active: true }
    ];

    for (const t of types) {
      const [, created] = await db.TransactionType.findOrCreate({
        where: { name: t.name },
        defaults: t
      });
      if (created) this.stats.transactionTypes++;
    }
    this.ok(`${this.stats.transactionTypes} new transaction types`);
  }

  // -------------------------------------------------------------------
  // PATIENTS
  // -------------------------------------------------------------------
  pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  randomPhone() {
    // 09XX XXX XXXX — unique enough for dev
    const suffix = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
    return `09${suffix}`;
  }

  randomBirthDate(minAge = 18, maxAge = 65) {
    const now = new Date();
    const age = minAge + Math.floor(Math.random() * (maxAge - minAge + 1));
    const year = now.getFullYear() - age;
    const month = Math.floor(Math.random() * 12);
    const day = 1 + Math.floor(Math.random() * 28);
    return new Date(Date.UTC(year, month, day)).toISOString().split('T')[0];
  }

  async findOrCreateLocation() {
    // Pick any existing city — nice-to-have so addresses aren't all null
    const city = await db.CityMunicipality.findOne({
      order: db.sequelize.random()
    });
    if (!city) return { region_id: null, province_id: null, city_municipality_id: null };

    const brgy = await db.Barangay.findOne({
      where: { cityMunicipalityId: city.id },
      order: db.sequelize.random()
    });

    return {
      region_id: city.regionId,
      province_id: city.provinceId,
      city_municipality_id: city.id,
      barangay_id: brgy ? brgy.id : null
    };
  }

  async seedDevPatients() {
    if (this.extraPatients <= 0) {
      this.info('DEV_EXTRA_PATIENTS=0 — skipping patient seeding');
      return;
    }

    this.log(`\nSeeding ${this.extraPatients} random dev patients...`);

    const firstNames = ['Alex', 'Sam', 'Jamie', 'Taylor', 'Jordan', 'Casey', 'Morgan', 'Riley', 'Avery', 'Quinn', 'Drew', 'Skyler'];
    const lastNames  = ['Cruz', 'Reyes', 'Santos', 'Garcia', 'Ramos', 'Torres', 'Flores', 'Rivera', 'Mendoza', 'Castillo'];
    const genders    = ['Male', 'Female', 'Other'];

    for (let i = 0; i < this.extraPatients; i++) {
      const firstName = this.pickRandom(firstNames);
      const lastName  = this.pickRandom(lastNames);
      const contact   = this.randomPhone();

      // Skip if contact already registered
      const exists = await db.Patient.findOne({
        where: { contact_number_hash: hmac(contact) }
      });
      if (exists) {
        this.info(`Skip (duplicate contact): ${contact}`);
        continue;
      }

      const username = `dev_${firstName.toLowerCase()}_${Date.now().toString().slice(-5)}_${i}`;
      const email    = `${username}@dev.local`;
      const purpose  = Math.random() > 0.5 ? 'testing' : 'treatment';

      // Create portal user
      const user = await db.User.create({
        username,
        email,
        password_hash: await bcrypt.hash('Patient@123', 10),
        role: 'patient',
        is_active: true
      });

      const loc = await this.findOrCreateLocation();

      const enrollment = new Date();
      enrollment.setDate(enrollment.getDate() - Math.floor(Math.random() * 365));

      const patient = await db.Patient.create({
        user_id: user.id,
        first_name: firstName,
        middle_name: '',
        last_name: lastName,
        suffix: '',
        birth_date: this.randomBirthDate(18, 65),
        gender: this.pickRandom(genders),
        contact_number: contact,
        sitio_street: `${1 + Math.floor(Math.random() * 200)} Dev St.`,
        barangay_id: loc.barangay_id,
        city_municipality_id: loc.city_municipality_id,
        province_id: loc.province_id,
        status: 'active',
        purpose,
        enrollment_date: enrollment.toISOString().split('T')[0],
        treatment_transition_date: purpose === 'treatment'
          ? enrollment.toISOString().split('T')[0]
          : null
      });

      this.stats.patients++;
      this.ok(`Patient: ${firstName} ${lastName} → ${patient.patient_facility_code}`);
    }
  }

  // -------------------------------------------------------------------
  // APPOINTMENTS for dev patients
  // -------------------------------------------------------------------
  async seedAppointmentsForDevPatients() {
    this.log('\nSeeding appointments for dev patients...');

    const devPatients = await db.Patient.findAll({
      include: [{
        model: db.User,
        as: 'User',
        where: { username: { [db.Sequelize.Op.like]: 'dev_%' } },
        required: true
      }]
    });

    if (!devPatients.length) {
      this.info('No dev patients found');
      return;
    }

    const types = await db.TransactionType.findAll();
    if (!types.length) {
      this.warn('No transaction types — skipping appointments');
      return;
    }

    const timeSlots = ['09:00:00', '10:00:00', '11:00:00', '13:00:00', '14:00:00', '15:00:00', '16:00:00'];

    for (const patient of devPatients) {
      const office = patient.purpose === 'treatment' ? 'treatment' : 'testing';
      const officeTypes = types.filter(t => t.office === office);
      if (!officeTypes.length) continue;

      const date = new Date();
      date.setDate(date.getDate() + Math.floor(Math.random() * 14) - 3); // -3 to +10 days
      date.setHours(0, 0, 0, 0);

      const slot = this.pickRandom(timeSlots);

      const exists = await db.Appointment.findOne({
        where: { patient_id: patient.id, appointment_date: date, time_slot: slot }
      });
      if (exists) continue;

      await db.Appointment.create({
        patient_id: patient.id,
        transaction_type_id: this.pickRandom(officeTypes).id,
        office,
        appointment_date: date,
        time_slot: slot,
        status: date < new Date() ? 'completed' : 'pending',
        notes: 'Dev seed',
        queued_at: null
      });
      this.stats.appointments++;
    }

    this.ok(`${this.stats.appointments} appointments`);
  }

  // -------------------------------------------------------------------
  // QUEUES
  // -------------------------------------------------------------------
  async seedQueues() {
    this.log('\nSeeding today\'s queues...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const office of ['testing', 'treatment']) {
      const [, created] = await db.Queue.findOrCreate({
        where: { office, date: today },
        defaults: {
          office,
          date: today,
          current_number: 0,
          completed_count: 0,
          skipped_count: 0,
          noshow_count: 0
        }
      });
      if (created) this.stats.queues++;
    }
    this.ok(`${this.stats.queues} queues`);
  }

  // -------------------------------------------------------------------
  // RUN
  // -------------------------------------------------------------------
  async run() {
    console.log('\n=========================================');
    console.log(' DEV SEEDER — safe to re-run');
    console.log('=========================================');

    try {
      await this.syncSchema();
      await this.seedSettings();
      await this.seedUsers();
      await this.seedTransactionTypes();
      await this.seedDevPatients();
      await this.seedAppointmentsForDevPatients();
      await this.seedQueues();

      console.log('\n=========================================');
      console.log(' DEV SEED COMPLETE');
      console.log('=========================================');
      console.log('\n📊 Created this run:');
      console.log(`  • Users:               ${this.stats.users}`);
      console.log(`  • Patients:            ${this.stats.patients}`);
      console.log(`  • Appointments:        ${this.stats.appointments}`);
      console.log(`  • Transaction types:   ${this.stats.transactionTypes}`);
      console.log(`  • System settings:     ${this.stats.settings}`);
      console.log(`  • Appointment settings:${this.stats.appointmentSettings}`);
      console.log(`  • Queues:              ${this.stats.queues}`);
      console.log('\n🔑 Dev credentials:');
      console.log('  admin  / Admin@123');
      console.log('  nurse  / Nurse@123');
      console.log('  pharma / Pharma@123');
      console.log('  dev_*  / Patient@123   (random dev patients)');
      console.log('');

      process.exit(0);
    } catch (err) {
      console.error('\n❌ Dev seed failed:', err);
      process.exit(1);
    }
  }
}

new DevSeeder().run();