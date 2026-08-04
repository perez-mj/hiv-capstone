require('dotenv').config();
const db = require('../models');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

class DataSeeder {
  constructor() {
    this.seededCounts = {
      patients: 0,
      appointments: 0,
      encounters: 0
    };
  }

  async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  async seedAdditionalPatients() {
    const additionalPatients = [
      {
        first_name: 'Gregorio',
        last_name: 'Mendoza',
        birth_date: '1972-04-18',
        gender: 'Male',
        contact_number: '09177890123',
        address: '777 Rizal Avenue, Zamboanga City',
        status: 'testing',
        emergency_contact: 'Teresa Mendoza',
        emergency_phone: '09177890124'
      },
      {
        first_name: 'Luzviminda',
        last_name: 'Dimagiba',
        birth_date: '1968-11-05',
        gender: 'Female',
        contact_number: '09178901234',
        address: '888 Mabuhay St, Iloilo City',
        status: 'treatment',
        emergency_contact: 'Rogelio Dimagiba',
        emergency_phone: '09178901235'
      },
      {
        first_name: 'Ramon',
        last_name: 'Bautista',
        birth_date: '1992-07-30',
        gender: 'Male',
        contact_number: '09179012345',
        address: '999 Bonifacio St, Baguio City',
        status: 'testing',
        emergency_contact: 'Leticia Bautista',
        emergency_phone: '09179012346'
      },
      {
        first_name: 'Angelica',
        last_name: 'Rivera',
        birth_date: '1987-02-14',
        gender: 'Female',
        contact_number: '09170123456',
        address: '111 Luna St, Naga City',
        status: 'treatment',
        emergency_contact: 'Dominic Rivera',
        emergency_phone: '09170123457'
      },
      {
        first_name: 'Fernando',
        last_name: 'Poe',
        birth_date: '1998-06-09',
        gender: 'Male',
        contact_number: '09171234567',
        address: '222 Quezon St, Legazpi City',
        status: 'testing',
        emergency_contact: 'Susan Poe',
        emergency_phone: '09171234568',
        guardian_name: 'Susan Poe (Mother)',
        guardian_contact: '09171234568'
      }
    ];
    
    for (const patientData of additionalPatients) {
      const existingPatient = await db.Patient.findOne({
        where: { contact_number: patientData.contact_number }
      });
      
      if (!existingPatient) {
        const username = `${patientData.first_name.toLowerCase()}.${patientData.last_name.toLowerCase()}`;
        const email = `${username}@email.com`;
        
        const hashedPassword = await this.hashPassword('Seed@123');
        const user = await db.User.create({
          username: username,
          email: email,
          password_hash: hashedPassword,
          role: 'patient',
          is_active: true
        });
        
        const patient = await db.Patient.create({
          user_id: user.id,
          ...patientData
        });
        
        this.seededCounts.patients++;
        console.log(`  ✓ Seeded patient: ${patientData.first_name} ${patientData.last_name}`);
      }
    }
  }

  async seedWalkInAppointments() {
    const patients = await db.Patient.findAll({
      limit: 10,
      order: db.sequelize.random()
    });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const timeSlots = ['08:30:00', '11:00:00', '13:30:00', '15:00:00', '16:30:00'];
    
    for (const patient of patients) {
      const randomTime = timeSlots[Math.floor(Math.random() * timeSlots.length)];
      const office = Math.random() > 0.5 ? 'testing' : 'treatment';
      
      const existingAppointment = await db.Appointment.findOne({
        where: {
          patient_id: patient.id,
          appointment_date: today,
          type: 'walk-in'
        }
      });
      
      if (!existingAppointment && Math.random() > 0.7) {
        const appointment = await db.Appointment.create({
          patient_id: patient.id,
          office: office,
          appointment_date: today,
          time_slot: randomTime,
          type: 'walk-in',
          status: 'pending'
        });
        
        this.seededCounts.appointments++;
        console.log(`  ✓ Seeded walk-in appointment for ${patient.first_name} ${patient.last_name}`);
      }
    }
  }

  async seedFollowUpEncounters() {
    const treatmentPatients = await db.Patient.findAll({
      where: { status: 'treatment' },
      include: [{ model: db.TreatmentEncounter }]
    });
    
    const staff = await db.User.findOne({
      where: { office: 'treatment', role: 'staff' }
    });
    
    if (!staff) return;
    
    for (const patient of treatmentPatients) {
      const lastEncounter = patient.TreatmentEncounters[patient.TreatmentEncounters.length - 1];
      
      if (lastEncounter && Math.random() > 0.6) {
        const followUpDays = [30, 60, 90, 120];
        const daysSinceLast = Math.floor(Math.random() * followUpDays.length);
        
        const followUpDate = new Date(lastEncounter.created_at);
        followUpDate.setDate(followUpDate.getDate() + followUpDays[daysSinceLast]);
        
        if (followUpDate < new Date()) {
          const cd4Change = Math.floor(Math.random() * 100) - 20;
          const newCd4 = Math.max(200, (lastEncounter.lab_results?.find(l => l.type === 'CD4')?.value || 500) + cd4Change);
          
          const viralLoadStatus = Math.random() > 0.8 ? 'Detectable' : 'Undetectable';
          const viralLoadValue = viralLoadStatus === 'Detectable' ? Math.floor(Math.random() * 10000) + 1000 : 'Undetectable';
          
          const encounter = await db.TreatmentEncounter.create({
            patient_id: patient.id,
            staff_id: staff.id,
            consultation_notes: {
              subjective: `Follow-up visit. Patient reports ${Math.random() > 0.9 ? 'some' : 'no'} side effects.`,
              objective: 'Vital signs stable. No new complaints.',
              assessment: `HIV management. CD4: ${newCd4}. VL: ${viralLoadValue}`,
              plan: 'Continue current regimen. Schedule next follow-up.'
            },
            art_prescription: lastEncounter.art_prescription,
            lab_results: [
              {
                type: 'CD4',
                value: newCd4,
                unit: 'cells/mm³',
                date: followUpDate.toISOString(),
                notes: newCd4 > 500 ? 'Good immune recovery' : 'Monitor closely'
              },
              {
                type: 'viral_load',
                value: viralLoadValue,
                unit: 'copies/mL',
                date: followUpDate.toISOString(),
                notes: viralLoadStatus === 'Undetectable' ? 'Excellent suppression' : 'Viremia detected'
              }
            ],
            adherence: {
              missed_doses_last_30_days: Math.random() > 0.8,
              missed_dose_count: Math.floor(Math.random() * 10),
              notes: Math.random() > 0.8 ? 'Discussed adherence barriers. Referred to counselor.' : 'Good adherence reported.'
            },
            next_appointment_date: new Date(followUpDate.getTime() + 90 * 24 * 60 * 60 * 1000)
          });
          
          this.seededCounts.encounters++;
          console.log(`  ✓ Seeded follow-up encounter for ${patient.first_name} ${patient.last_name}`);
        }
      }
    }
  }

  async seedMissedAppointments() {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 15);
    
    const patients = await db.Patient.findAll({
      limit: 5,
      order: db.sequelize.random()
    });
    
    for (const patient of patients) {
      const appointment = await db.Appointment.create({
        patient_id: patient.id,
        office: patient.status === 'treatment' ? 'treatment' : 'testing',
        appointment_date: pastDate,
        time_slot: '14:00:00',
        type: 'scheduled',
        status: 'no-show',
        queue_number: null
      });
      
      console.log(`  ✓ Seeded missed appointment for ${patient.first_name} ${patient.last_name}`);
    }
  }

  async seedSystemSettingsUpdates() {
    const additionalSettings = [
      {
        key: 'backup_auto_schedule',
        value: 'daily',
        description: 'Automatic backup schedule (daily/weekly/monthly)',
        data_type: 'string',
        category: 'backup'
      },
      {
        key: 'backup_retention_days',
        value: '30',
        description: 'Number of days to keep automated backups',
        data_type: 'number',
        category: 'backup'
      },
      {
        key: 'max_file_upload_size_mb',
        value: '10',
        description: 'Maximum file upload size in megabytes',
        data_type: 'number',
        category: 'system'
      },
      {
        key: 'allowed_file_types',
        value: '["jpg","jpeg","png","pdf","doc","docx"]',
        description: 'Allowed file types for uploads',
        data_type: 'json',
        category: 'system'
      },
      {
        key: 'enable_telemedicine',
        value: 'false',
        description: 'Enable telemedicine/video consultation features',
        data_type: 'boolean',
        category: 'features'
      },
      {
        key: 'require_2fa_for_admin',
        value: 'false',
        description: 'Require two-factor authentication for admin accounts',
        data_type: 'boolean',
        category: 'security'
      }
    ];
    
    for (const setting of additionalSettings) {
      const [record, created] = await db.SystemSetting.findOrCreate({
        where: { key: setting.key },
        defaults: setting
      });
      
      if (created) {
        console.log(`  ✓ Added system setting: ${setting.key}`);
      }
    }
  }

  async run() {
    try {
      console.log('\n=================================');
      console.log('Data Seeding Started');
      console.log('=================================\n');
      
      console.log('Seeding additional patients...');
      await this.seedAdditionalPatients();
      
      console.log('\nSeeding walk-in appointments...');
      await this.seedWalkInAppointments();
      
      console.log('\nSeeding follow-up encounters...');
      await this.seedFollowUpEncounters();
      
      console.log('\nSeeding missed appointments...');
      await this.seedMissedAppointments();
      
      console.log('\nSeeding additional system settings...');
      await this.seedSystemSettingsUpdates();
      
      console.log('\n=================================');
      console.log('Data Seeding Complete!');
      console.log('=================================');
      console.log('\n📊 Seeding Summary:');
      console.log(`  • New Patients: ${this.seededCounts.patients}`);
      console.log(`  • New Appointments: ${this.seededCounts.appointments}`);
      console.log(`  • New Encounters: ${this.seededCounts.encounters}`);
      console.log('\n✨ Additional test data has been added to the system!\n');
      
    } catch (error) {
      console.error('\n❌ Error seeding data:', error);
      process.exit(1);
    }
  }
}

// Run the seeder
const seeder = new DataSeeder();
seeder.run();