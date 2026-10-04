// backend/scripts/seedDev.js
require('dotenv').config();
const db = require('../models');
const bcrypt = require('bcryptjs');
const { hmac } = require('../utils/crypto');

/**
 * Dev seeder — safe to re-run.
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
      queues: 0,
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
    await db.sequelize.sync({ alter: false });
    this.ok('Schema in sync');
  }

  // -------------------------------------------------------------------
  // SETTINGS
  // -------------------------------------------------------------------
  async seedSettings() {
    this.log('\nSeeding settings...');

    const systemSettings = [
      { key: 'blockchain_enabled', value: 'false', data_type: 'boolean', category: 'security', description: 'MultiChain logging' },
      { key: 'clinic_name', value: process.env.CLINIC_NAME || 'Dev HIV Care Center', data_type: 'string', category: 'appearance', description: 'Clinic display name' },
    ];

    for (const s of systemSettings) {
      const [, created] = await db.SystemSetting.findOrCreate({
        where: { key: s.key },
        defaults: s,
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
        is_active: true,
      },
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
      { username: 'admin',  email: 'admin@dev.local',  password: 'Admin@123',  role: 'admin', office: null },
      { username: 'nurse',  email: 'nurse@dev.local',  password: 'Nurse@123',  role: 'staff', office: 'testing' },
      { username: 'pharma', email: 'pharma@dev.local', password: 'Pharma@123', role: 'staff', office: 'treatment' },
    ];

    for (const u of users) {
      const [user, created] = await db.User.findOrCreate({
        where: { username: u.username },
        defaults: {
          username: u.username,
          email: u.email,
          password_hash: u.password, // plain — hook hashes once
          role: u.role,
          office: u.office,
          is_active: true,
        },
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
      { name: 'Testing Result',      office: 'testing',   estimated_duration_minutes: 30, color_code: '#a0e999', is_active: true },
      { name: 'New - STI Consultation',      office: 'testing',   estimated_duration_minutes: 30, color_code: '#4CAF50', is_active: true },
      { name: 'Old - STI Consultation',      office: 'testing',   estimated_duration_minutes: 30, color_code: '#4CAF50', is_active: true },
      { name: 'Consultation', office: 'treatment', estimated_duration_minutes: 45, color_code: '#FF9800', is_active: true },
      { name: 'Refill',       office: 'treatment', estimated_duration_minutes: 15, color_code: '#2196F3', is_active: true },
      { name: 'Other',        office: 'treatment', estimated_duration_minutes: 20, color_code: '#9C27B0', is_active: true },
    ];

    for (const t of types) {
      const [, created] = await db.TransactionType.findOrCreate({
        where: { name: t.name },
        defaults: t,
      });
      if (created) this.stats.transactionTypes++;
    }
    this.ok(`${this.stats.transactionTypes} new transaction types`);
  }

  // -------------------------------------------------------------------
  // RANDOM HELPERS
  // -------------------------------------------------------------------
  pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  maybe(value, probability = 0.5) {
    return Math.random() < probability ? value : null;
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

  randomSitioStreet() {
    const prefixes = ['Purok', 'Sitio', 'Blk', 'Phase'];
    const streets  = ['Mabini', 'Rizal', 'Bonifacio', 'Del Pilar', 'Luna', 'Aguinaldo', 'Katipunan', 'Magsaysay'];
    const n = 1 + Math.floor(Math.random() * 250);
    return `${n} ${this.pickRandom(streets)} St., ${this.pickRandom(prefixes)} ${1 + Math.floor(Math.random() * 7)}`;
  }

  /**
   * Returns a random existing location set from the PSGC tables.
   * Safe when PSGC tables are empty — returns all nulls.
   */
  async findRandomLocation() {
    const city = await db.CityMunicipality.findOne({
      order: db.sequelize.random(),
    });
    if (!city) return { province_id: null, city_municipality_id: null, barangay_id: null };

    const brgy = await db.Barangay.findOne({
      where: { city_municipality_id: city.id }, // snake_case — matches migration
      order: db.sequelize.random(),
    });

    return {
      province_id: city.province_id ?? city.provinceId ?? null,
      city_municipality_id: city.id,
      barangay_id: brgy ? brgy.id : null,
    };
  }

  // -------------------------------------------------------------------
  // PATIENTS
  // -------------------------------------------------------------------
  async seedDevPatients() {
    if (this.extraPatients <= 0) {
      this.info('DEV_EXTRA_PATIENTS=0 — skipping patient seeding');
      return;
    }

    this.log(`\nSeeding ${this.extraPatients} random dev patients...`);

    const firstNames  = ['Alex', 'Sam', 'Jamie', 'Taylor', 'Jordan', 'Casey', 'Morgan', 'Riley', 'Avery', 'Quinn', 'Drew', 'Skyler'];
    const middleNames = ['Abad', 'Bautista', 'Castro', 'Domingo', 'Enriquez', 'Fernandez', 'Gonzales', 'Herrera', 'Ignacio', 'Jimenez'];
    const lastNames   = ['Cruz', 'Reyes', 'Santos', 'Garcia', 'Ramos', 'Torres', 'Flores', 'Rivera', 'Mendoza', 'Castillo'];
    const suffixes    = [null, null, null, 'Jr.', 'Sr.', 'III']; // mostly null
    const genders     = ['Male', 'Female', 'Other'];
    const purposes    = ['testing', 'treatment'];

    for (let i = 0; i < this.extraPatients; i++) {
      const firstName  = this.pickRandom(firstNames);
      const middleName = this.pickRandom(middleNames);
      const lastName   = this.pickRandom(lastNames);
      const suffix     = this.pickRandom(suffixes);
      const contact    = this.randomPhone();

      // Skip if contact already registered
      const exists = await db.Patient.findOne({
        where: { contact_number_hash: hmac(contact) },
      });
      if (exists) {
        this.info(`Skip (duplicate contact): ${contact}`);
        continue;
      }

      const username = `dev_${firstName.toLowerCase()}_${Date.now().toString().slice(-5)}_${i}`;
      const email    = `${username}@dev.local`;
      const purpose  = this.pickRandom(purposes);

      // Create portal user — plain-text password, hook hashes once
      const user = await db.User.create({
        username,
        email,
        password_hash: 'Patient@123',
        role: 'patient',
        is_active: true,
      });

      // ---- CURRENT ADDRESS ----
      const currentLoc = await this.findRandomLocation();

      // ---- PERMANENT ADDRESS ----
      // 60% of the time: same as current (flag = true, fields auto-synced)
      // 40% of the time: independent permanent address
      const sameAsCurrent = Math.random() < 0.6;
      const permanentLoc  = sameAsCurrent ? currentLoc : await this.findRandomLocation();
      const permanentStreet = this.randomSitioStreet();

      const enrollment = new Date();
      enrollment.setDate(enrollment.getDate() - Math.floor(Math.random() * 365));

      const patient = await db.Patient.create({
        user_id: user.id,

        // --- identity ---
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        suffix: suffix || '',
        birth_date: this.randomBirthDate(18, 65),
        gender: this.pickRandom(genders),

        // --- contact ---
        contact_number: contact,
        email: this.maybe(`${username}.contact@dev.local`, 0.7),
        facebook_messenger: this.maybe(`fb.com/${username}`, 0.4),

        // --- current address ---
        sitio_street: this.randomSitioStreet(),
        barangay_id: currentLoc.barangay_id,
        city_municipality_id: currentLoc.city_municipality_id,
        province_id: currentLoc.province_id,

        // --- permanent address ---
        same_as_current_address: sameAsCurrent,
        permanent_sitio_street: permanentStreet,
        permanent_barangay_id: permanentLoc.barangay_id,
        permanent_city_municipality_id: permanentLoc.city_municipality_id,
        permanent_province_id: permanentLoc.province_id,

        // --- meta ---
        status: 'active',
        purpose,
        enrollment_date: enrollment.toISOString().split('T')[0],
        treatment_transition_date:
          purpose === 'treatment' ? enrollment.toISOString().split('T')[0] : null,
      });

      this.stats.patients++;
      this.ok(
        `Patient: ${firstName} ${middleName.charAt(0)}. ${lastName}${suffix ? ' ' + suffix : ''} → ${patient.patient_facility_code}` +
        ` [${sameAsCurrent ? 'same-as-current' : 'permanent≠current'}]`
      );
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
        required: true,
      }],
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
        where: { patient_id: patient.id, appointment_date: date, time_slot: slot },
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
        queued_at: null,
      });
      this.stats.appointments++;
    }

    this.ok(`${this.stats.appointments} appointments`);
  }

  // -------------------------------------------------------------------
  // QUEUES
  // -------------------------------------------------------------------
  async seedQueues() {
    this.log("\nSeeding today's queues...");

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
          noshow_count: 0,
        },
      });
      if (created) this.stats.queues++;
    }
    this.ok(`${this.stats.queues} queues`);
  }

  // -------------------------------------------------------------------
  // VERIFY — assert every dev credential actually authenticates
  // -------------------------------------------------------------------
  async verifyPasswords() {
    this.log('\nVerifying dev credentials against the database...');

    const checks = [
      { username: 'admin',  password: 'Admin@123'  },
      { username: 'nurse',  password: 'Nurse@123'  },
      { username: 'pharma', password: 'Pharma@123' },
    ];

    // Also verify one random dev patient (if any exist)
    const devPatient = await db.User.findOne({
      where: { username: { [db.Sequelize.Op.like]: 'dev_%' } },
      order: [['id', 'DESC']],
    });
    if (devPatient) {
      checks.push({ username: devPatient.username, password: 'Patient@123' });
    }

    let failed = 0;
    for (const { username, password } of checks) {
      const user = await db.User.findOne({ where: { username } });
      if (!user) {
        this.warn(`MISSING  ${username} — no DB row`);
        failed++;
        continue;
      }

      const ok = await bcrypt.compare(password, user.password_hash);
      if (ok) {
        this.ok(`PASS     ${username}`);
      } else {
        // Extra diagnostics — helps spot double-hashing
        const looksLikeBcrypt = /^\$2[aby]\$\d{2}\$/.test(user.password_hash);
        this.warn(
          `FAIL     ${username} — hash prefix: ${user.password_hash.slice(0, 7)}… ` +
          `(bcrypt=${looksLikeBcrypt})`
        );
        failed++;
      }
    }

    if (failed > 0) {
      throw new Error(`${failed} credential check(s) failed — see above`);
    }
    this.ok(`All ${checks.length} credentials verified`);
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

      // Fail loudly if any credential can't authenticate
      await this.verifyPasswords();

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