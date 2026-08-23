// backend/scripts/initDb.js
require('dotenv').config();
const db = require('../models');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const patientCodeService = require('../services/patientCodeService');
const crypto = require('crypto');

class DatabaseInitializer {
  constructor() {
    this.createdRecords = {
      users: [],
      patients: [],
      settings: [],
      appointmentSettings: [], // New
      appointments: [],
      refreshTokens: [],
      transactionTypes: []
    };
    this.passwordValidationResults = [];
    this.expectedCredentials = {
      // Admin
      'admin': 'Admin@123',
      // Testing Staff
      'nurse': 'Nurse@123',
      // Treatment Staff
      'pharma': 'Pharma@123',
      // Patients (only for validation purposes)
      'juan.delacruz': 'Patient@123',
      'maria.santos': 'Patient@123',
      'jose.reyes': 'Patient@123',
      'ana.gonzales': 'Patient@123',
      'michael.fernandez': 'Patient@123',
      'kristine.villanueva': 'Patient@123',
      'roberto.aquino': 'Patient@123',
      'carmen.ramirez': 'Patient@123'
    };
  }

  async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  async validatePassword(password, hash) {
    try {
      const isValid = await bcrypt.compare(password, hash);
      return { isValid, password, hash };
    } catch (error) {
      return { isValid: false, password, hash, error: error.message };
    }
  }

  async validateAllPasswords() {
    console.log('\n🔐 Validating stored passwords...');

    const users = await db.User.findAll({
      attributes: ['id', 'username', 'password_hash', 'role']
    });

    let validCount = 0;
    let invalidCount = 0;
    let uncheckedCount = 0;

    for (const user of users) {
      const expectedPassword = this.expectedCredentials[user.username];

      if (!expectedPassword) {
        uncheckedCount++;
        console.log(`  ⚠️ ${user.username}: No expected password defined (skipping validation)`);
        continue;
      }

      const result = await this.validatePassword(expectedPassword, user.password_hash);
      this.passwordValidationResults.push({
        username: user.username,
        role: user.role,
        ...result
      });

      if (result.isValid) {
        validCount++;
        console.log(`  ✅ ${user.username} (${user.role}): Password validated successfully`);
      } else {
        invalidCount++;
        console.log(`  ❌ ${user.username} (${user.role}): Password validation failed - ${result.error || 'Invalid password'}`);
      }
    }

    console.log(`\n📊 Password Validation Summary:`);
    console.log(`  ✅ Valid passwords: ${validCount}`);
    console.log(`  ❌ Invalid passwords: ${invalidCount}`);
    console.log(`  ⚠️  Unchecked passwords: ${uncheckedCount}`);
    console.log(`  📝 Total users checked: ${users.length}`);

    return { validCount, invalidCount, uncheckedCount };
  }

  // NEW: Create appointment settings in the dedicated table
  async createAppointmentSettings() {
    console.log('\nCreating appointment settings...');

    // Global default settings (office = null)
    const defaultSettings = {
      office: null,
      start_time: '08:00:00',
      end_time: '17:00:00',
      slot_duration_minutes: 30,
      max_capacity_per_slot: 5,
      lunch_start: '12:00:00',
      lunch_end: '13:00:00',
      daily_capacity: 20,
      working_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
      holidays: ['2026-12-25', '2026-12-30', '2026-01-01'],
      advance_booking_days: 30,
      booking_lead_time_minutes: 60,
      max_appointments_per_patient_per_day: 1,
      allow_online_booking: true,
      allow_online_cancellation: true,
      cancellation_deadline_hours: 24,
      is_active: true
    };

    // Check if global settings exist
    let globalSettings = await db.AppointmentSetting.findOne({
      where: { office: null }
    });

    if (!globalSettings) {
      globalSettings = await db.AppointmentSetting.create(defaultSettings);
      this.createdRecords.appointmentSettings.push(globalSettings);
      console.log('  ✓ Created global appointment settings');
    } else {
      console.log('  ℹ️ Global appointment settings already exist');
    }

    // Create office-specific settings if needed (optional)
    // For testing office
    let testingSettings = await db.AppointmentSetting.findOne({
      where: { office: 'testing' }
    });

    if (!testingSettings) {
      testingSettings = await db.AppointmentSetting.create({
        office: 'testing',
        start_time: '08:00:00',
        end_time: '16:00:00', // Testing closes earlier
        slot_duration_minutes: 30,
        max_capacity_per_slot: 3, // Less capacity for testing
        lunch_start: '12:00:00',
        lunch_end: '13:00:00',
        daily_capacity: 16,
        working_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
        holidays: ['2026-12-25', '2026-12-30', '2026-01-01'],
        advance_booking_days: 30,
        booking_lead_time_minutes: 60,
        max_appointments_per_patient_per_day: 1,
        allow_online_booking: true,
        allow_online_cancellation: true,
        cancellation_deadline_hours: 24,
        is_active: true
      });
      this.createdRecords.appointmentSettings.push(testingSettings);
      console.log('  ✓ Created testing office appointment settings');
    }

    // For treatment office
    let treatmentSettings = await db.AppointmentSetting.findOne({
      where: { office: 'treatment' }
    });

    if (!treatmentSettings) {
      treatmentSettings = await db.AppointmentSetting.create({
        office: 'treatment',
        start_time: '08:30:00', // Treatment starts later
        end_time: '18:00:00', // Treatment stays open later
        slot_duration_minutes: 45, // Longer slots for treatment
        max_capacity_per_slot: 4,
        lunch_start: '12:00:00',
        lunch_end: '13:00:00',
        daily_capacity: 16,
        working_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
        holidays: ['2026-12-25', '2026-12-30', '2026-01-01'],
        advance_booking_days: 30,
        booking_lead_time_minutes: 60,
        max_appointments_per_patient_per_day: 1,
        allow_online_booking: true,
        allow_online_cancellation: true,
        cancellation_deadline_hours: 24,
        is_active: true
      });
      this.createdRecords.appointmentSettings.push(treatmentSettings);
      console.log('  ✓ Created treatment office appointment settings');
    }

    console.log(`✓ Created ${this.createdRecords.appointmentSettings.length} appointment settings`);
  }

  // Keep SystemSettings for non-appointment related settings
  async createSystemSettings() {
    console.log('\nCreating system settings...');

    const allSettings = [
      // Clinic Operations (non-appointment specific)
      {
        key: 'max_walk_in_per_day',
        value: '10',
        description: 'Hard limit on unscheduled walk-ins to prevent overwhelming staff',
        data_type: 'number',
        category: 'clinic_operations'
      },
      {
        key: 'no_show_grace_minutes',
        value: '15',
        description: 'Minutes after "called" before patient is marked as no-show',
        data_type: 'number',
        category: 'clinic_operations'
      },
      // Clinical Workflow
      {
        key: 'default_art_refill_days',
        value: '30',
        description: 'Default days until next ART refill',
        data_type: 'number',
        category: 'clinical'
      },
      {
        key: 'default_next_appointment_days',
        value: '90',
        description: 'Default follow-up interval for stable ART patients',
        data_type: 'number',
        category: 'clinical'
      },
      // Security
      {
        key: 'blockchain_enabled',
        value: 'true',
        description: 'Master toggle for MultiChain logging',
        data_type: 'boolean',
        category: 'security'
      },
      {
        key: 'max_login_attempts',
        value: '5',
        description: 'Lock account temporarily after X failed logins',
        data_type: 'number',
        category: 'security'
      },
      // Appearance
      {
        key: 'clinic_name',
        value: 'Hope HIV Care Center',
        description: 'Displayed on web portal headers and printed slips',
        data_type: 'string',
        category: 'appearance'
      },
      {
        key: 'clinic_address',
        value: '123 Main St, City',
        description: 'Printed on slips and email footers',
        data_type: 'string',
        category: 'appearance'
      },
      {
        key: 'clinic_contact',
        value: '+63-2-888-1234',
        description: 'Emergency contact number',
        data_type: 'string',
        category: 'appearance'
      },
      {
        key: 'primary_color',
        value: '#1A73E8',
        description: 'Vue.js/Vuetify primary theme color',
        data_type: 'string',
        category: 'appearance'
      },
      {
        key: 'timezone',
        value: 'Asia/Manila',
        description: 'Ensures correct date/time logic offset',
        data_type: 'string',
        category: 'appearance'
      },
    ];

    let createdCount = 0;
    for (const setting of allSettings) {
      const [record, created] = await db.SystemSetting.findOrCreate({
        where: { key: setting.key },
        defaults: setting
      });
      if (created) {
        this.createdRecords.settings.push(record);
        createdCount++;
        console.log(`  ✓ Created setting: ${setting.key} (${setting.category})`);
      }
    }
    console.log(`✓ Created ${createdCount} system settings`);
  }

  async createUsers() {
    console.log('\nCreating users...');

    const users = [
      {
        username: 'admin',
        email: 'admin@hivclinic.com',
        password: 'Admin@123',
        role: 'admin',
        office: null,
        is_active: true
      },
      {
        username: 'nurse',
        email: 'nurse.reyes@hivclinic.com',
        password: 'Nurse@123',
        role: 'staff',
        office: 'testing',
        is_active: true
      },
      {
        username: 'pharma',
        email: 'pharmacist.lim@hivclinic.com',
        password: 'Pharma@123',
        role: 'staff',
        office: 'treatment',
        is_active: true
      }
    ];

    let createdCount = 0;
    for (const userData of users) {
      const existingUser = await db.User.findOne({
        where: { username: userData.username }
      });

      if (!existingUser) {
        const user = await db.User.create({
          username: userData.username,
          email: userData.email,
          password_hash: userData.password,
          role: userData.role,
          office: userData.office,
          is_active: userData.is_active
        });
        this.createdRecords.users.push(user);
        createdCount++;
        console.log(`  ✓ Created user: ${userData.username} (${userData.role})`);
      }
    }
    console.log(`✓ Created ${createdCount} users`);
  }

  generateRefreshToken() {
    return crypto.randomBytes(40).toString('hex');
  }

  async createRefreshTokens() {
    console.log('\nCreating refresh tokens for users...');
    
    const users = await db.User.findAll({
      where: { is_active: true }
    });

    let createdCount = 0;
    for (const user of users) {
      const numTokens = Math.floor(Math.random() * 2) + 1;
      
      for (let i = 0; i < numTokens; i++) {
        const token = this.generateRefreshToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        
        const refreshToken = await db.RefreshToken.create({
          token: token,
          user_id: user.id,
          expires_at: expiresAt,
          revoked: i === 1 ? true : false,
          ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
          user_agent: i === 0 
            ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            : 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
        });

        this.createdRecords.refreshTokens.push(refreshToken);
        createdCount++;
        console.log(`  ✓ Created refresh token for ${user.username} (${refreshToken.revoked ? 'revoked' : 'active'})`);
      }
    }

    console.log(`✓ Created ${createdCount} refresh tokens`);
  }

  async createPatients() {
    console.log('\nCreating patients...');
    
    const today = new Date();
    const currentYear = today.getFullYear();
    
    const patients = [
      {
        first_name: 'Juan',
        middle_name: 'Cruz',
        last_name: 'Dela Cruz',
        birth_date: '1990-05-15',
        gender: 'Male',
        contact_number: '09171234567',
        address: '123 Roxas Blvd, Manila',
        status: 'treatment',
        emergency_contact: 'Maria Dela Cruz',
        emergency_phone: '09171234568',
        enrollment_date: `${currentYear - 2}-01-15`,
        treatment_transition_date: `${currentYear - 2}-02-01`,
        user: {
          username: 'juan.delacruz',
          email: 'juan.delacruz@email.com',
          password: 'Patient@123',
          role: 'patient'
        }
      },
      {
        first_name: 'Maria',
        middle_name: 'Isabel',
        last_name: 'Santos',
        birth_date: '1985-08-22',
        gender: 'Female',
        contact_number: '09179876543',
        address: '456 Katipunan Ave, Quezon City',
        status: 'testing',
        emergency_contact: 'Jose Santos',
        emergency_phone: '09179876544',
        enrollment_date: `${currentYear}-01-10`,
        treatment_transition_date: null,
        user: {
          username: 'maria.santos',
          email: 'maria.santos@email.com',
          password: 'Patient@123',
          role: 'patient'
        }
      },
      {
        first_name: 'Jose',
        middle_name: 'Protacio',
        last_name: 'Reyes',
        birth_date: '1978-03-10',
        gender: 'Male',
        contact_number: '09175678901',
        address: '789 Osmeña Blvd, Cebu City',
        status: 'treatment',
        emergency_contact: 'Ana Reyes',
        emergency_phone: '09175678902',
        enrollment_date: `${currentYear - 3}-06-20`,
        treatment_transition_date: `${currentYear - 3}-07-15`,
        user: {
          username: 'jose.reyes',
          email: 'jose.reyes@email.com',
          password: 'Patient@123',
          role: 'patient'
        }
      },
      {
        first_name: 'Ana',
        middle_name: 'Marie',
        last_name: 'Gonzales',
        birth_date: '1995-12-01',
        gender: 'Female',
        contact_number: '09172345678',
        address: '321 F. Torres St, Davao City',
        status: 'testing',
        emergency_contact: 'Roberto Gonzales',
        emergency_phone: '09172345679',
        enrollment_date: `${currentYear}-03-05`,
        treatment_transition_date: null,
        user: {
          username: 'ana.gonzales',
          email: 'ana.gonzales@email.com',
          password: 'Patient@123',
          role: 'patient'
        }
      },
      {
        first_name: 'Michael',
        middle_name: 'James',
        last_name: 'Fernandez',
        birth_date: '1982-07-19',
        gender: 'Male',
        contact_number: '09173456789',
        address: '555 MacArthur Highway, Pampanga',
        status: 'treatment',
        emergency_contact: 'Susan Fernandez',
        emergency_phone: '09173456790',
        enrollment_date: `${currentYear - 1}-08-10`,
        treatment_transition_date: `${currentYear - 1}-09-01`,
        user: {
          username: 'michael.fernandez',
          email: 'michael.fernandez@email.com',
          password: 'Patient@123',
          role: 'patient'
        }
      },
      {
        first_name: 'Kristine',
        middle_name: 'Joy',
        last_name: 'Villanueva',
        birth_date: '2000-03-25',
        gender: 'Female',
        contact_number: '09174567890',
        address: '888 Rizal St, Laguna',
        status: 'testing',
        emergency_contact: 'Ramon Villanueva',
        emergency_phone: '09174567891',
        guardian_name: 'Ramon Villanueva (Father)',
        guardian_contact: '09174567891',
        enrollment_date: `${currentYear}-02-14`,
        treatment_transition_date: null,
        user: {
          username: 'kristine.villanueva',
          email: 'kristine@email.com',
          password: 'Patient@123',
          role: 'patient'
        }
      },
      {
        first_name: 'Roberto',
        middle_name: 'Manuel',
        last_name: 'Aquino',
        birth_date: '1975-11-30',
        gender: 'Male',
        contact_number: '09175678901',
        address: '123 Mabini St, Batangas',
        status: 'treatment',
        emergency_contact: 'Linda Aquino',
        emergency_phone: '09175678902',
        enrollment_date: `${currentYear - 4}-04-10`,
        treatment_transition_date: `${currentYear - 4}-05-01`,
        user: {
          username: 'roberto.aquino',
          email: 'roberto.aquino@email.com',
          password: 'Patient@123',
          role: 'patient'
        }
      },
      {
        first_name: 'Carmen',
        middle_name: 'Rosa',
        last_name: 'Ramirez',
        birth_date: '1988-09-14',
        gender: 'Female',
        contact_number: '09176789012',
        address: '456 Laurel St, Cavite',
        status: 'treatment',
        emergency_contact: 'Pedro Ramirez',
        emergency_phone: '09176789013',
        enrollment_date: `${currentYear - 1}-11-20`,
        treatment_transition_date: `${currentYear - 1}-12-01`,
        user: {
          username: 'carmen.ramirez',
          email: 'carmen.ramirez@email.com',
          password: 'Patient@123',
          role: 'patient'
        }
      }
    ];

    let createdCount = 0;
    for (const patientData of patients) {
      const existingPatient = await db.Patient.findOne({
        where: { contact_number: patientData.contact_number }
      });

      if (!existingPatient) {
        const user = await db.User.create({
          username: patientData.user.username,
          email: patientData.user.email,
          password_hash: patientData.user.password,
          role: patientData.user.role,
          is_active: true
        });

        const patientCode = await patientCodeService.generateFacilityCode({
          first_name: patientData.first_name,
          middle_name: patientData.middle_name || '',
          last_name: patientData.last_name,
          status: patientData.status,
          enrollment_date: patientData.enrollment_date,
          treatment_transition_date: patientData.treatment_transition_date
        });

        const patient = await db.Patient.create({
          user_id: user.id,
          first_name: patientData.first_name,
          middle_name: patientData.middle_name,
          last_name: patientData.last_name,
          birth_date: patientData.birth_date,
          gender: patientData.gender,
          contact_number: patientData.contact_number,
          address: patientData.address,
          status: patientData.status,
          patient_facility_code: patientCode,
          emergency_contact: patientData.emergency_contact,
          emergency_phone: patientData.emergency_phone,
          guardian_name: patientData.guardian_name,
          guardian_contact: patientData.guardian_contact,
          enrollment_date: patientData.enrollment_date,
          treatment_transition_date: patientData.treatment_transition_date
        });

        this.createdRecords.patients.push(patient);
        createdCount++;
        
        console.log(`  ✓ Created patient: ${patientData.first_name} ${patientData.last_name}`);
        console.log(`    → Facility Code: ${patient.patient_facility_code} (${patientData.status})`);
      }
    }
    console.log(`✓ Created ${createdCount} patients`);
  }

  async createTestingEncounters() {
    console.log('\nCreating testing encounters...');
    
    const patients = await db.Patient.findAll({
      where: { status: 'testing' },
      include: [{ model: db.User, as: 'User' }]
    });

    const staff = await db.User.findOne({
      where: {
        office: 'testing',
        role: 'staff'
      }
    });

    if (!staff) {
      console.log('  ⚠️ No testing staff found, skipping testing encounters');
      return;
    }

    const encounters = [
      {
        patient: patients.find(p => p.first_name === 'Maria'),
        result: 'negative',
        pretest_notes: 'Patient educated about HIV transmission and prevention. Consent obtained.',
        posttest_notes: 'Negative result explained. Discussed window period and need for repeat testing in 3 months.'
      },
      {
        patient: patients.find(p => p.first_name === 'Ana'),
        result: 'positive',
        pretest_notes: 'Comprehensive pre-test counseling provided. Patient understands implications of testing.',
        posttest_notes: 'Positive result disclosed with empathy. Immediate referral to treatment office arranged. Emotional support provided.'
      },
      {
        patient: patients.find(p => p.first_name === 'Kristine'),
        result: 'indeterminate',
        pretest_notes: 'Counseling provided to minor with guardian present.',
        posttest_notes: 'Indeterminate result explained. Scheduled for repeat testing in 2 weeks.'
      }
    ];

    let createdCount = 0;
    for (const enc of encounters) {
      if (!enc.patient) continue;

      const encounter = await db.TestingEncounter.create({
        patient_id: enc.patient.id,
        staff_id: staff.id,
        pretest_counseling: {
          conducted: true,
          notes: enc.pretest_notes,
          checklist: [
            'Explained HIV and AIDS basics',
            'Discussed modes of transmission',
            'Explained testing procedure',
            'Discussed window period',
            'Explained confidentiality',
            'Discussed possible outcomes',
            'Obtained verbal consent'
          ]
        },
        hiv_test: {
          result: enc.result,
          kit_lot_number: `HIV-KIT-2024-${Math.floor(Math.random() * 1000)}`,
          tested_by: staff.username,
          test_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        posttest_counseling: {
          conducted: true,
          notes: enc.posttest_notes,
          checklist: [
            'Explained result meaning',
            'Discussed prevention methods',
            'Provided risk reduction counseling',
            'Addressed questions and concerns',
            'Discussed partner notification',
            'Scheduled follow-up'
          ]
        },
        referral: {
          referred_to_treatment: enc.result === 'positive',
          reason: enc.result === 'positive' ? 'Positive HIV test result' : null,
          referred_at: enc.result === 'positive' ? new Date().toISOString() : null
        }
      });

      createdCount++;
      if (enc.result === 'positive') {
        await enc.patient.update({ status: 'treatment' });
        console.log(`  ✓ Created testing encounter for ${enc.patient.first_name} ${enc.patient.last_name} (${enc.result}) - Referred to treatment`);
      } else {
        console.log(`  ✓ Created testing encounter for ${enc.patient.first_name} ${enc.patient.last_name} (${enc.result})`);
      }
    }
    console.log(`✓ Created ${createdCount} testing encounters`);
  }

  async createTreatmentEncounters() {
    console.log('\nCreating treatment encounters...');
    
    const patients = await db.Patient.findAll({
      where: { status: 'treatment' },
      include: [{ model: db.User, as: 'User' }]
    });

    const staff = await db.User.findOne({
      where: {
        office: 'treatment',
        role: 'staff'
      }
    });

    if (!staff) {
      console.log('  ⚠️ No treatment staff found, skipping treatment encounters');
      return;
    }

    const encounters = [
      {
        patient: patients.find(p => p.first_name === 'Juan'),
        art_regimen: 'TDF/3TC/DTG',
        cd4: 650,
        viral_load: 'Undetectable',
        adherence_rate: 100,
        next_appointment_days: 90
      },
      {
        patient: patients.find(p => p.first_name === 'Jose'),
        art_regimen: 'AZT/3TC/NVP',
        cd4: 420,
        viral_load: '1500',
        adherence_rate: 95,
        next_appointment_days: 60
      },
      {
        patient: patients.find(p => p.first_name === 'Michael'),
        art_regimen: 'TDF/3TC/EFV',
        cd4: 580,
        viral_load: 'Undetectable',
        adherence_rate: 98,
        next_appointment_days: 90
      },
      {
        patient: patients.find(p => p.first_name === 'Roberto'),
        art_regimen: 'TDF/3TC/DTG',
        cd4: 380,
        viral_load: '2500',
        adherence_rate: 85,
        next_appointment_days: 30
      },
      {
        patient: patients.find(p => p.first_name === 'Carmen'),
        art_regimen: 'ABC/3TC/DTG',
        cd4: 510,
        viral_load: 'Undetectable',
        adherence_rate: 100,
        next_appointment_days: 90
      }
    ];

    let createdCount = 0;
    for (const enc of encounters) {
      if (!enc.patient) continue;

      const encounter = await db.TreatmentEncounter.create({
        patient_id: enc.patient.id,
        staff_id: staff.id,
        consultation_notes: {
          subjective: `Patient reports feeling well. No complaints of side effects. Adherence to ART is ${enc.adherence_rate}%.`,
          objective: `Vital signs stable. No signs of opportunistic infections. Weight stable.`,
          assessment: `HIV well-controlled on ${enc.art_regimen}. CD4 count ${enc.cd4}. VL ${enc.viral_load}.`,
          plan: `Continue current ART regimen. Follow-up in ${enc.next_appointment_days} days with repeat CD4 and VL.`
        },
        art_prescription: {
          medication_name: enc.art_regimen,
          dosage: '1 tablet',
          frequency: 'Once daily',
          quantity: `${enc.next_appointment_days} tablets`,
          refill_date: new Date(Date.now() + enc.next_appointment_days * 24 * 60 * 60 * 1000),
          prescribed_by: staff.username
        },
        lab_results: [
          {
            type: 'CD4',
            value: enc.cd4,
            unit: 'cells/mm³',
            date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            notes: enc.cd4 > 500 ? 'Good immune function' : 'Monitor closely'
          },
          {
            type: 'viral_load',
            value: enc.viral_load,
            unit: 'copies/mL',
            date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            notes: enc.viral_load === 'Undetectable' ? 'Excellent viral suppression' : 'Viral load detectable, monitor adherence'
          }
        ],
        adherence: {
          missed_doses_last_30_days: enc.adherence_rate < 95,
          missed_dose_count: Math.floor((100 - enc.adherence_rate) / 100 * 30),
          notes: enc.adherence_rate < 95 ? 'Discussed barriers to adherence. Referred to adherence counselor.' : 'Good adherence reported.'
        },
        next_appointment_date: new Date(Date.now() + enc.next_appointment_days * 24 * 60 * 60 * 1000)
      });

      createdCount++;
      console.log(`  ✓ Created treatment encounter for ${enc.patient.first_name} ${enc.patient.last_name}`);
      console.log(`    → ART Regimen: ${enc.art_regimen}, CD4: ${enc.cd4}, VL: ${enc.viral_load}`);
    }
    console.log(`✓ Created ${createdCount} treatment encounters`);
  }

  async createTransactionTypes() {
    console.log('\nCreating transaction types...');
    
    // Initialize the array if it doesn't exist
    if (!this.createdRecords.transactionTypes) {
      this.createdRecords.transactionTypes = [];
    }
    
    const transactionTypes = [
      {
        name: 'Testing',
        office: 'testing',
        estimated_duration_minutes: 30,
        description: 'Initial HIV screening and testing',
        color_code: '#4CAF50',
        is_active: true
      },
      {
        name: 'Consultation',
        office: 'treatment',
        estimated_duration_minutes: 45,
        description: 'Standard ART consultation',
        color_code: '#FF9800',
        is_active: true
      },
      {
        name: 'Refill',
        office: 'treatment',
        estimated_duration_minutes: 15,
        description: 'Quick prescription refill',
        color_code: '#2196F3',
        is_active: true
      },
      {
        name: 'Other',
        office: 'treatment',
        estimated_duration_minutes: 20,
        description: 'Other treatment-related appointments',
        color_code: '#9C27B0',
        is_active: true
      },
    ];

    let createdCount = 0;
    for (const typeData of transactionTypes) {
      try {
        const [type, created] = await db.TransactionType.findOrCreate({
          where: { name: typeData.name },
          defaults: typeData
        });
        
        if (created) {
          this.createdRecords.transactionTypes.push(type);
          createdCount++;
          console.log(`  ✓ Created transaction type: ${typeData.name} (${typeData.office})`);
        } else {
          console.log(`  ℹ️ Transaction type already exists: ${typeData.name}`);
        }
      } catch (error) {
        console.log(`  ✗ Failed to create transaction type: ${typeData.name}`, error.message);
      }
    }
    
    console.log(`✓ Created ${createdCount} transaction types`);
    
    // Verify they were saved
    try {
      const count = await db.TransactionType.count();
      console.log(`✓ Verification: ${count} transaction types exist in database`);
    } catch (error) {
      console.log(`⚠️ Could not verify transaction types:`, error.message);
    }
  }

  async createAppointments() {
    console.log('\nCreating appointments...');
    
    // Initialize the array if it doesn't exist
    if (!this.createdRecords.appointments) {
      this.createdRecords.appointments = [];
    }
    
    // Get all patients
    const patients = await db.Patient.findAll();
    if (patients.length === 0) {
      console.log('  ⚠️ No patients found. Please seed patients first.');
      return;
    }
    
    // Get all transaction types
    const transactionTypes = await db.TransactionType.findAll();
    if (transactionTypes.length === 0) {
      console.log('  ⚠️ No transaction types found. Please seed transaction types first.');
      return;
    }
    
    console.log(`  Found ${patients.length} patients and ${transactionTypes.length} transaction types`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create dates for appointments (today, tomorrow, 3 days, 7 days)
    const dates = [
      today,
      new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000),
      new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000),
      new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    ];

    // Available time slots
    const timeSlots = [
      '09:00:00', 
      '09:30:00', 
      '10:00:00', 
      '10:30:00', 
      '11:00:00',
      '11:30:00', 
      '13:00:00', 
      '13:30:00', 
      '14:00:00', 
      '14:30:00', 
      '15:00:00', 
      '15:30:00', 
      '16:00:00'
    ];

    let createdCount = 0;
    let skippedCount = 0;

    for (const patient of patients) {
      // Determine office based on patient status
      const office = patient.status === 'treatment' ? 'treatment' : 'testing';
      
      // Get appropriate transaction types for this office
      const typesForOffice = transactionTypes.filter(t => t.office === office);
      
      if (typesForOffice.length === 0) {
        console.log(`  ⚠️ No transaction types for office: ${office} (Patient: ${patient.first_name} ${patient.last_name})`);
        skippedCount++;
        continue;
      }

      // Each patient gets 1-3 appointments
      const numAppointments = Math.floor(Math.random() * 3) + 1;
      
      // Track used time slots to avoid duplicates for the same patient on the same day
      const usedSlots = new Set();

      for (let j = 0; j < numAppointments; j++) {
        // Pick random date from the available dates
        const date = dates[Math.floor(Math.random() * dates.length)];
        
        // Pick a random time slot that hasn't been used for this patient on this date
        let timeSlot;
        let attempts = 0;
        let foundSlot = false;
        
        while (!foundSlot && attempts < 20) {
          timeSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
          const slotKey = `${date.toISOString().split('T')[0]}_${timeSlot}`;
          
          if (!usedSlots.has(slotKey)) {
            usedSlots.add(slotKey);
            foundSlot = true;
          }
          attempts++;
        }
        
        if (!foundSlot) {
          console.log(`  ⚠️ Could not find unique time slot for ${patient.first_name} ${patient.last_name}`);
          continue;
        }

        // Pick a random transaction type
        const transactionType = typesForOffice[Math.floor(Math.random() * typesForOffice.length)];
        
        if (!transactionType || !transactionType.id) {
          console.log(`  ⚠️ Invalid transaction type for patient ${patient.first_name} ${patient.last_name}`);
          skippedCount++;
          continue;
        }

        // Check if appointment already exists for this patient at this time
        const existingAppointment = await db.Appointment.findOne({
          where: {
            patient_id: patient.id,
            appointment_date: date,
            time_slot: timeSlot
          }
        });

        if (!existingAppointment) {
          try {
            // Determine status based on date
            let status = 'pending';
            if (date < today) {
              status = Math.random() > 0.3 ? 'completed' : 'cancelled';
            } else if (date.getTime() === today.getTime()) {
              status = Math.random() > 0.5 ? 'pending' : 'checked-in';
            }
            
            // Create the appointment
            const appointment = await db.Appointment.create({
              patient_id: patient.id,
              transaction_type_id: transactionType.id,
              office: office,
              appointment_date: date,
              time_slot: timeSlot,
              status: status,
              notes: `Seeded appointment for ${patient.first_name} ${patient.last_name}`,
              checked_in_at: status === 'checked-in' ? new Date() : null,
              completed_at: status === 'completed' ? new Date(date.getTime() + 3600000) : null
            });

            this.createdRecords.appointments.push(appointment);
            createdCount++;
            
            console.log(`  ✓ Created appointment: ${patient.first_name} ${patient.last_name} - ${office} - ${date.toISOString().split('T')[0]} ${timeSlot}`);
            
          } catch (error) {
            console.log(`  ✗ Failed to create appointment for ${patient.first_name} ${patient.last_name}:`, error.message);
            skippedCount++;
          }
        } else {
          console.log(`  ℹ️ Appointment already exists for ${patient.first_name} ${patient.last_name} on ${date.toISOString().split('T')[0]} at ${timeSlot}`);
          skippedCount++;
        }
      }
    }

    console.log(`✓ Created ${createdCount} appointments (${skippedCount} skipped)`);
    
    // Verification
    try {
      const count = await db.Appointment.count();
      console.log(`✓ Verification: ${count} appointments exist in database`);
    } catch (error) {
      console.log(`⚠️ Could not verify appointments:`, error.message);
    }
  }

  async createQueues() {
    console.log('\nCreating queues...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const offices = ['testing', 'treatment'];
    let createdCount = 0;

    for (const office of offices) {
      const [queue, created] = await db.Queue.findOrCreate({
        where: {
          office: office,
          date: today
        },
        defaults: {
          office: office,
          date: today,
          current_number: 0,
          completed_count: 0,
          skipped_count: 0,
          noshow_count: 0
        }
      });

      if (created) {
        createdCount++;
        console.log(`  ✓ Created queue for ${office} office (${today.toDateString()})`);
      }
    }
    console.log(`✓ Created ${createdCount} queues`);
  }

  async createAuditLogs() {
    console.log('\nCreating audit logs...');
    
    const users = await db.User.findAll();

    const actions = ['CREATE', 'UPDATE', 'VIEW', 'LOGIN', 'LOGOUT', 'TOKEN_REFRESH', 'PASSWORD_CHANGE'];
    const entities = ['Patient', 'Appointment', 'User', 'SystemSetting', 'RefreshToken'];

    let createdCount = 0;
    for (let i = 0; i < 50; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const action = actions[Math.floor(Math.random() * actions.length)];
      const entity = entities[Math.floor(Math.random() * entities.length)];

      await db.AuditLog.create({
        user_id: user.id,
        action: action,
        entity_type: entity,
        entity_id: Math.floor(Math.random() * 100) + 1,
        old_data: action === 'UPDATE' ? { field: 'old_value' } : null,
        new_data: action !== 'DELETE' ? { field: 'new_value' } : null,
        ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
        user_agent: 'Mozilla/5.0 (System Init)',
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      });
      createdCount++;
    }

    console.log(`✓ Created ${createdCount} sample audit logs`);
  }

  displayCredentials() {
    console.log('\n🔐 LOGIN CREDENTIALS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n📌 Administrator:');
    console.log(`  ✅ Username: admin`);
    console.log(`     Password: Admin@123`);

    console.log('\n📌 Testing Staff:');
    console.log(`  ✅ Username: nurse`);
    console.log(`     Password: Nurse@123`);

    console.log('\n📌 Treatment Staff:');
    console.log(`  ✅ Username: pharma`);
    console.log(`     Password: Pharma@123`);

    console.log('\n📌 Patients (8 patients):');
    console.log(`  ✅ Username: juan.delacruz`);
    console.log(`     Password: Patient@123`);
    console.log(`  ✅ Username: maria.santos`);
    console.log(`     Password: Patient@123`);
    console.log(`  ✅ Username: jose.reyes`);
    console.log(`     Password: Patient@123`);
    console.log(`  ✅ Username: ana.gonzales`);
    console.log(`     Password: Patient@123`);
    console.log(`  ✅ Username: michael.fernandez`);
    console.log(`     Password: Patient@123`);
    console.log(`  ✅ Username: kristine.villanueva`);
    console.log(`     Password: Patient@123`);
    console.log(`  ✅ Username: roberto.aquino`);
    console.log(`     Password: Patient@123`);
    console.log(`  ✅ Username: carmen.ramirez`);
    console.log(`     Password: Patient@123`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const validCount = this.passwordValidationResults.filter(r => r.isValid).length;
    const totalCount = this.passwordValidationResults.length;
    const uncheckedCount = Object.keys(this.expectedCredentials).length - totalCount;

    if (validCount === totalCount && totalCount > 0 && uncheckedCount === 0) {
      console.log('✅ ALL PASSWORDS VALIDATED SUCCESSFULLY');
    } else {
      console.log('⚠️  Some passwords failed validation - check the logs above');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  async run() {
    try {
      console.log('\n=================================');
      console.log('Database Initialization Started');
      console.log('=================================\n');

      console.log('Syncing database schema...');
      await db.sequelize.sync({ force: true });
      console.log('✓ Database schema synced\n');

      // Create appointment settings FIRST (needed for scheduling)
      await this.createAppointmentSettings();

      // Create system settings (non-appointment settings)
      await this.createSystemSettings();

      console.log('\nCreating transaction types...');
      await this.createTransactionTypes();

      console.log('\nCreating users...');
      await this.createUsers();

      console.log('\nCreating patients...');
      await this.createPatients();

      console.log('\nCreating refresh tokens...');
      await this.createRefreshTokens();

      console.log('\nCreating testing encounters...');
      await this.createTestingEncounters();

      console.log('\nCreating treatment encounters...');
      await this.createTreatmentEncounters();

      console.log('\nCreating appointments...');
      await this.createAppointments();

      console.log('\nCreating queues...');
      await this.createQueues();

      console.log('\nCreating audit logs...');
      await this.createAuditLogs();

      await this.validateAllPasswords();

      console.log('\n=================================');
      console.log('Database Initialization Complete!');
      console.log('=================================');
      console.log('\n📊 Summary:');
      console.log(`  • Users: ${this.createdRecords.users.length + 8} (plus system users)`);
      console.log(`  • Patients: ${this.createdRecords.patients.length}`);
      console.log(`  • System Settings: ${this.createdRecords.settings.length}`);
      console.log(`  • Appointment Settings: ${this.createdRecords.appointmentSettings.length}`);
      console.log(`  • Appointments: ${this.createdRecords.appointments.length}`);
      console.log(`  • Refresh Tokens: ${this.createdRecords.refreshTokens.length}`);

      this.displayCredentials();

      console.log('✨ You can now start the server: npm run dev\n');

    } catch (error) {
      console.error('\n❌ Error initializing database:', error);
      process.exit(1);
    }
  }
}

const initializer = new DatabaseInitializer();
initializer.run();