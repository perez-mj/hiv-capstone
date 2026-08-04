const db = require('../models');
const bcrypt = require('bcryptjs');

class InitialDataSeeder {
  constructor() {
    this.data = {
      users: [],
      patients: [],
      systemSettings: [],
      auditLogs: []
    };
  }

  async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  async seedCoreUsers() {
    const coreUsers = [
      {
        username: 'system_admin',
        email: 'system@hivclinic.com',
        password: 'System@2024',
        role: 'admin',
        office: null,
        is_active: true
      },
      {
        username: 'chief_doctor',
        email: 'chief.doctor@hivclinic.com',
        password: 'Chief@2024',
        role: 'staff',
        office: 'treatment',
        is_active: true
      },
      {
        username: 'head_nurse',
        email: 'head.nurse@hivclinic.com',
        password: 'HeadNurse@2024',
        role: 'staff',
        office: 'testing',
        is_active: true
      }
    ];
    
    for (const userData of coreUsers) {
      const existingUser = await db.User.findOne({
        where: { username: userData.username }
      });
      
      if (!existingUser) {
        const hashedPassword = await this.hashPassword(userData.password);
        const user = await db.User.create({
          ...userData,
          password_hash: hashedPassword
        });
        this.data.users.push(user);
        console.log(`  ✓ Core user created: ${userData.username}`);
      }
    }
  }

  async seedEssentialSettings() {
    const essentialSettings = [
      {
        key: 'system_name',
        value: 'HIV Patient Management System',
        description: 'System display name',
        data_type: 'string'
      },
      {
        key: 'system_version',
        value: '1.0.0',
        description: 'Current system version',
        data_type: 'string'
      },
      {
        key: 'clinic_address',
        value: '123 Health St., Medical Center, Manila, Philippines',
        description: 'Clinic physical address',
        data_type: 'string'
      },
      {
        key: 'clinic_phone',
        value: '+63 (2) 8123-4567',
        description: 'Clinic contact number',
        data_type: 'string'
      },
      {
        key: 'clinic_email',
        value: 'info@hivclinic.com',
        description: 'Clinic email address',
        data_type: 'string'
      },
      {
        key: 'operating_hours',
        value: '{"monday_friday": "8:00 AM - 5:00 PM", "saturday": "9:00 AM - 12:00 PM", "sunday": "Closed"}',
        description: 'Clinic operating hours',
        data_type: 'json'
      },
      {
        key: 'holiday_schedule',
        value: '["2024-01-01", "2024-04-09", "2024-06-12", "2024-08-21", "2024-11-30", "2024-12-25", "2024-12-30"]',
        description: 'List of holiday dates when clinic is closed',
        data_type: 'json'
      },
      {
        key: 'printer_config',
        value: '{"type": "thermal", "width": 48, "charset": "utf-8"}',
        description: 'Queue slip printer configuration',
        data_type: 'json'
      },
      {
        key: 'kiosk_timeout_seconds',
        value: '120',
        description: 'Kiosk idle timeout in seconds',
        data_type: 'number'
      },
      {
        key: 'default_language',
        value: 'en',
        description: 'Default system language',
        data_type: 'string'
      }
    ];
    
    for (const setting of essentialSettings) {
      const [record, created] = await db.SystemSetting.findOrCreate({
        where: { key: setting.key },
        defaults: setting
      });
      
      if (created) {
        this.data.systemSettings.push(record);
        console.log(`  ✓ Essential setting created: ${setting.key}`);
      }
    }
  }

  async seedInitialAuditTrail() {
    const systemUser = await db.User.findOne({
      where: { username: 'system_admin' }
    });
    
    if (systemUser) {
      const initialAudits = [
        {
          user_id: systemUser.id,
          action: 'CREATE',
          entity_type: 'System',
          entity_id: 1,
          new_data: { event: 'System initialization' },
          ip_address: '127.0.0.1',
          user_agent: 'System Installer'
        },
        {
          user_id: systemUser.id,
          action: 'UPDATE',
          entity_type: 'System',
          entity_id: 1,
          new_data: { status: 'Initialized' },
          ip_address: '127.0.0.1',
          user_agent: 'System Installer'
        }
      ];
      
      for (const audit of initialAudits) {
        const log = await db.AuditLog.create(audit);
        this.data.auditLogs.push(log);
      }
      console.log('  ✓ Initial audit trail created');
    }
  }

  async seedReferenceData() {
    // Seed common medications
    const medications = [
      { name: 'Tenofovir Disoproxil Fumarate', abbreviation: 'TDF', type: 'NRTI' },
      { name: 'Lamivudine', abbreviation: '3TC', type: 'NRTI' },
      { name: 'Efavirenz', abbreviation: 'EFV', type: 'NNRTI' },
      { name: 'Dolutegravir', abbreviation: 'DTG', type: 'INSTI' },
      { name: 'Zidovudine', abbreviation: 'AZT', type: 'NRTI' },
      { name: 'Nevirapine', abbreviation: 'NVP', type: 'NNRTI' },
      { name: 'Abacavir', abbreviation: 'ABC', type: 'NRTI' },
      { name: 'Raltegravir', abbreviation: 'RAL', type: 'INSTI' }
    ];
    
    // Store in system settings as JSON
    await db.SystemSetting.findOrCreate({
      where: { key: 'medication_list' },
      defaults: {
        key: 'medication_list',
        value: JSON.stringify(medications),
        description: 'List of available ART medications',
        data_type: 'json'
      }
    });
    
    // Seed common lab test references
    const labTests = [
      { name: 'CD4 Count', unit: 'cells/mm³', normal_range: '500-1500', critical_low: 200 },
      { name: 'Viral Load', unit: 'copies/mL', normal_range: 'Undetectable', critical_high: 10000 },
      { name: 'Hemoglobin', unit: 'g/dL', normal_range: '12-16', critical_low: 8 },
      { name: 'Creatinine', unit: 'mg/dL', normal_range: '0.6-1.2', critical_high: 2.0 },
      { name: 'ALT', unit: 'U/L', normal_range: '10-40', critical_high: 100 }
    ];
    
    await db.SystemSetting.findOrCreate({
      where: { key: 'lab_tests' },
      defaults: {
        key: 'lab_tests',
        value: JSON.stringify(labTests),
        description: 'Reference ranges for laboratory tests',
        data_type: 'json'
      }
    });
    
    console.log('  ✓ Reference data seeded (medications, lab tests)');
  }

  async run() {
    try {
      console.log('\n=================================');
      console.log('Initial Data Seeding Started');
      console.log('=================================\n');
      
      console.log('Creating core users...');
      await this.seedCoreUsers();
      
      console.log('\nCreating essential system settings...');
      await this.seedEssentialSettings();
      
      console.log('\nCreating initial audit trail...');
      await this.seedInitialAuditTrail();
      
      console.log('\nSeeding reference data...');
      await this.seedReferenceData();
      
      console.log('\n=================================');
      console.log('Initial Data Seeding Complete!');
      console.log('=================================');
      console.log('\n📊 Seed Summary:');
      console.log(`  • Core Users: ${this.data.users.length}`);
      console.log(`  • System Settings: ${this.data.systemSettings.length}`);
      console.log(`  • Audit Logs: ${this.data.auditLogs.length}`);
      console.log('\n✅ System is ready for use!\n');
      
    } catch (error) {
      console.error('\n❌ Error seeding initial data:', error);
      process.exit(1);
    }
  }
}

// Export for use in other scripts
module.exports = InitialDataSeeder;

// Run if called directly
if (require.main === module) {
  const seeder = new InitialDataSeeder();
  seeder.run();
}