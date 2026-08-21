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
      appointments: [],
      refreshTokens: []
    };
    this.passwordValidationResults = [];
    this.expectedCredentials = {
      // Admin
      'admin': 'Admin@123',
      // Testing Staff
      'nurse': 'Nurse@123',
      // Treatment Staff
      'pharma': 'Pharma@123',
      // Patients
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

  async createSystemSettings() {
    const settings = [
      {
        key: 'daily_capacity_testing',
        value: '50',
        description: 'Maximum number of patients per day in testing office',
        data_type: 'number',
        category: 'capacity'
      },
      {
        key: 'daily_capacity_treatment',
        value: '40',
        description: 'Maximum number of patients per day in treatment office',
        data_type: 'number',
        category: 'capacity'
      },
      {
        key: 'queue_prefix_testing',
        value: 'T',
        description: 'Queue number prefix for testing office',
        data_type: 'string',
        category: 'queue'
      },
      {
        key: 'queue_prefix_treatment',
        value: 'R',
        description: 'Queue number prefix for treatment office',
        data_type: 'string',
        category: 'queue'
      },
      {
        key: 'appointment_reminder_days',
        value: '1',
        description: 'Days before appointment to send reminder',
        data_type: 'number',
        category: 'notifications'
      },
      {
        key: 'appointment_reminder_hours',
        value: '24',
        description: 'Hours before appointment to send reminder',
        data_type: 'number',
        category: 'notifications'
      },
      {
        key: 'walkin_priority',
        value: 'after_scheduled',
        description: 'Walk-in patient priority (after_scheduled or interleaved)',
        data_type: 'string',
        category: 'queue'
      },
      {
        key: 'allow_online_booking',
        value: 'true',
        description: 'Allow patients to book appointments online',
        data_type: 'boolean',
        category: 'appointments'
      },
      {
        key: 'allow_online_cancellation',
        value: 'true',
        description: 'Allow patients to cancel appointments online',
        data_type: 'boolean',
        category: 'appointments'
      },
      {
        key: 'cancellation_deadline_hours',
        value: '24',
        description: 'Hours before appointment when cancellation is allowed',
        data_type: 'number',
        category: 'appointments'
      },
      {
        key: 'require_guardian_for_minors',
        value: 'true',
        description: 'Require guardian information for patients under 18',
        data_type: 'boolean',
        category: 'registration'
      },
      {
        key: 'minor_age_limit',
        value: '18',
        description: 'Age below which patient is considered a minor',
        data_type: 'number',
        category: 'registration'
      },
      {
        key: 'blockchain_enabled',
        value: 'true',
        description: 'Enable blockchain audit trail',
        data_type: 'boolean',
        category: 'security'
      },
      {
        key: 'blockchain_verify_on_read',
        value: 'true',
        description: 'Verify blockchain hash when reading records',
        data_type: 'boolean',
        category: 'security'
      },
      {
        key: 'audit_log_retention_days',
        value: '2555',
        description: 'Number of days to retain audit logs (7 years)',
        data_type: 'number',
        category: 'compliance'
      },
      {
        key: 'session_timeout_minutes',
        value: '30',
        description: 'User session timeout in minutes',
        data_type: 'number',
        category: 'security'
      },
      {
        key: 'max_login_attempts',
        value: '5',
        description: 'Maximum failed login attempts before lockout',
        data_type: 'number',
        category: 'security'
      },
      {
        key: 'lockout_duration_minutes',
        value: '15',
        description: 'Account lockout duration after max attempts',
        data_type: 'number',
        category: 'security'
      },
      {
        key: 'enable_sms_notifications',
        value: 'true',
        description: 'Send SMS notifications for appointments',
        data_type: 'boolean',
        category: 'notifications'
      },
      {
        key: 'enable_email_notifications',
        value: 'true',
        description: 'Send email notifications for appointments',
        data_type: 'boolean',
        category: 'notifications'
      },
      {
        key: 'default_art_regimen',
        value: 'TDF/3TC/DTG',
        description: 'Default first-line ART regimen',
        data_type: 'string',
        category: 'clinical'
      },
      {
        key: 'cd4_threshold',
        value: '500',
        description: 'CD4 count threshold for treatment initiation',
        data_type: 'number',
        category: 'clinical'
      },
      {
        key: 'viral_load_suppression_threshold',
        value: '1000',
        description: 'Viral load below which is considered suppressed',
        data_type: 'number',
        category: 'clinical'
      },
      // New settings for token management
      {
        key: 'access_token_expiry_minutes',
        value: '15',
        description: 'Access token expiry time in minutes',
        data_type: 'number',
        category: 'security'
      },
      {
        key: 'refresh_token_expiry_days',
        value: '7',
        description: 'Refresh token expiry time in days',
        data_type: 'number',
        category: 'security'
      },
      {
        key: 'enable_refresh_token_rotation',
        value: 'true',
        description: 'Enable refresh token rotation for enhanced security',
        data_type: 'boolean',
        category: 'security'
      }
    ];

    for (const setting of settings) {
      const [record, created] = await db.SystemSetting.findOrCreate({
        where: { key: setting.key },
        defaults: setting
      });
      if (created) {
        this.createdRecords.settings.push(record);
        console.log(`  ✓ Created setting: ${setting.key}`);
      }
    }
    console.log(`✓ Created ${settings.length} system settings`);
  }

  async createUsers() {
    const users = [
      // Admin
      {
        username: 'admin',
        email: 'admin@hivclinic.com',
        password: 'Admin@123',
        role: 'admin',
        office: null,
        is_active: true
      },
      // Testing Staff
      {
        username: 'nurse',
        email: 'nurse.reyes@hivclinic.com',
        password: 'Nurse@123',
        role: 'staff',
        office: 'testing',
        is_active: true
      },
      // Treatment Staff
      {
        username: 'pharma',
        email: 'pharmacist.lim@hivclinic.com',
        password: 'Pharma@123',
        role: 'staff',
        office: 'treatment',
        is_active: true
      }
    ];

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
        console.log(`  ✓ Created user: ${userData.username} (${userData.role})`);
      }
    }
  }

  // Helper method to generate refresh token
  generateRefreshToken() {
    return crypto.randomBytes(40).toString('hex');
  }

  async createRefreshTokens() {
    console.log('\nCreating refresh tokens for users...');
    
    const users = await db.User.findAll({
      where: { is_active: true }
    });

    for (const user of users) {
      // Create 1-2 refresh tokens per user
      const numTokens = Math.floor(Math.random() * 2) + 1;
      
      for (let i = 0; i < numTokens; i++) {
        const token = this.generateRefreshToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry
        
        const refreshToken = await db.RefreshToken.create({
          token: token,
          user_id: user.id,
          expires_at: expiresAt,
          revoked: i === 1 ? true : false, // Randomly revoke some tokens for testing
          ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
          user_agent: i === 0 
            ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            : 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
        });

        this.createdRecords.refreshTokens.push(refreshToken);
        console.log(`  ✓ Created refresh token for ${user.username} (${refreshToken.revoked ? 'revoked' : 'active'})`);
      }
    }

    console.log(`✓ Created ${this.createdRecords.refreshTokens.length} refresh tokens`);
  }

  async createPatients() {
    // Get current date for enrollment dates
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
        guardian_name: null,
        guardian_contact: null,
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
        guardian_name: null,
        guardian_contact: null,
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
        guardian_name: null,
        guardian_contact: null,
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
        guardian_name: null,
        guardian_contact: null,
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
        guardian_name: null,
        guardian_contact: null,
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
        guardian_name: null,
        guardian_contact: null,
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
        guardian_name: null,
        guardian_contact: null,
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

        // Generate facility code with enrollment and transition dates
        const patientCode = await patientCodeService.generateFacilityCode({
          first_name: patientData.first_name,
          middle_name: patientData.middle_name || '',
          last_name: patientData.last_name,
          status: patientData.status,
          enrollment_date: patientData.enrollment_date,
          treatment_transition_date: patientData.treatment_transition_date
        });

        // Create patient with all fields including new date fields
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
        
        // Log the facility code generation details
        const codeYear = patientData.status === 'treatment' ? 
          patientData.treatment_transition_date?.slice(0,4) : 
          patientData.enrollment_date.slice(0,4);
        
        console.log(`  ✓ Created patient: ${patientData.first_name} ${patientData.middle_name || ''} ${patientData.last_name}`);
        console.log(`    → Facility Code: ${patient.patient_facility_code} (${patientData.status}, ${codeYear})`);
        console.log(`    → Enrolled: ${patientData.enrollment_date}`);
        if (patientData.treatment_transition_date) {
          console.log(`    → Transitioned to treatment: ${patientData.treatment_transition_date}`);
        }
      }
    }
  }

  async createTestingEncounters() {
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

    for (const enc of encounters) {
      if (!enc.patient) {
        console.log(`  ⚠️ Skipping testing encounter - patient not found`);
        continue;
      }

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

      if (enc.result === 'positive') {
        // Update patient status to treatment
        await enc.patient.update({ status: 'treatment' });
        console.log(`  ✓ Created testing encounter for ${enc.patient.first_name} ${enc.patient.last_name} (${enc.result}) - Referred to treatment`);
        console.log(`    → Patient transitioned to treatment on ${new Date().toISOString().split('T')[0]}`);
      } else {
        console.log(`  ✓ Created testing encounter for ${enc.patient.first_name} ${enc.patient.last_name} (${enc.result})`);
      }
    }
  }

  async createTreatmentEncounters() {
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

    for (const enc of encounters) {
      if (!enc.patient) {
        console.log(`  ⚠️ Skipping treatment encounter - patient not found`);
        continue;
      }

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

      console.log(`  ✓ Created treatment encounter for ${enc.patient.first_name} ${enc.patient.last_name}`);
      console.log(`    → ART Regimen: ${enc.art_regimen}, CD4: ${enc.cd4}, VL: ${enc.viral_load}`);
    }
  }

  async createAppointments() {
    const patients = await db.Patient.findAll();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dates = [
      today,
      new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000),
      new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000),
      new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    ];

    const timeSlots = ['09:00:00', '10:30:00', '13:00:00', '14:30:00', '16:00:00'];

    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];
      const numAppointments = Math.floor(Math.random() * 3) + 1;

      for (let j = 0; j < numAppointments; j++) {
        const date = dates[Math.floor(Math.random() * dates.length)];
        const timeSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
        const office = patient.status === 'treatment' ? 'treatment' : 'testing';

        const existingAppointment = await db.Appointment.findOne({
          where: {
            patient_id: patient.id,
            appointment_date: date,
            time_slot: timeSlot
          }
        });

        if (!existingAppointment) {
          const appointment = await db.Appointment.create({
            patient_id: patient.id,
            office: office,
            appointment_date: date,
            time_slot: timeSlot,
            type: Math.random() > 0.7 ? 'walk-in' : 'scheduled',
            status: date < today ? 'completed' : (date.getTime() === today.getTime() ? 'pending' : 'scheduled'),
            queue_number: null
          });

          this.createdRecords.appointments.push(appointment);
        }
      }
    }

    console.log(`  ✓ Created ${this.createdRecords.appointments.length} appointments`);
  }

  async createQueues() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const offices = ['testing', 'treatment'];

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
        console.log(`  ✓ Created queue for ${office} office (${today.toDateString()})`);
      }
    }
  }

  async createAuditLogs() {
    const users = await db.User.findAll();

    const actions = ['CREATE', 'UPDATE', 'VIEW', 'LOGIN', 'LOGOUT', 'TOKEN_REFRESH', 'PASSWORD_CHANGE'];
    const entities = ['Patient', 'Appointment', 'User', 'SystemSetting', 'RefreshToken'];

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
    }

    console.log('  ✓ Created 50 sample audit logs');
  }

  displayCredentials() {
    console.log('\n🔐 LOGIN CREDENTIALS (All passwords validated):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const credentials = {
      'Administrator': [
        { username: 'admin', password: 'Admin@123' }
      ],
      'Testing Staff': [
        { username: 'nurse', password: 'Nurse@123' }
      ],
      'Treatment Staff': [
        { username: 'pharma', password: 'Pharma@123' }
      ],
      'Patients': [
        { username: 'juan.delacruz', password: 'Patient@123' },
        { username: 'maria.santos', password: 'Patient@123' },
        { username: 'jose.reyes', password: 'Patient@123' },
        { username: 'ana.gonzales', password: 'Patient@123' },
        { username: 'michael.fernandez', password: 'Patient@123' },
        { username: 'kristine.villanueva', password: 'Patient@123' },
        { username: 'roberto.aquino', password: 'Patient@123' },
        { username: 'carmen.ramirez', password: 'Patient@123' }
      ]
    };

    for (const [role, users] of Object.entries(credentials)) {
      console.log(`\n📌 ${role}:`);
      for (const cred of users) {
        const validation = this.passwordValidationResults.find(
          v => v.username === cred.username
        );
        const status = validation?.isValid ? '✅' : (validation ? '❌' : '⚠️');
        console.log(`  ${status} Username: ${cred.username}`);
        console.log(`     Password: ${cred.password}`);
        if (validation && !validation.isValid) {
          console.log(`     ⚠️  Warning: Password validation failed - ${validation.error || 'Invalid password'}`);
        }
        if (!validation) {
          console.log(`     ⚠️  Warning: Password not validated (user not found or not checked)`);
        }
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const validCount = this.passwordValidationResults.filter(r => r.isValid).length;
    const totalCount = this.passwordValidationResults.length;
    const uncheckedCount = Object.keys(this.expectedCredentials).length - totalCount;

    if (validCount === totalCount && totalCount > 0 && uncheckedCount === 0) {
      console.log('✅ ALL PASSWORDS VALIDATED SUCCESSFULLY');
    } else {
      if (validCount < totalCount) {
        console.log(`⚠️  WARNING: ${totalCount - validCount} password(s) failed validation`);
        console.log('   Please check the validation errors above and recreate if necessary.');
      }
      if (uncheckedCount > 0) {
        console.log(`⚠️  NOTE: ${uncheckedCount} expected user(s) were not found in the database`);
      }
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

      console.log('Creating system settings...');
      await this.createSystemSettings();

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
      console.log(`  • Settings: ${this.createdRecords.settings.length}`);
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