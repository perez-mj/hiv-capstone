const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const db = require('../models');

const execPromise = util.promisify(exec);

class BackupService {
  constructor() {
    this.backupDir = path.join(__dirname, '../../backups');
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }
  
  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `backup-${timestamp}`);
    
    try {
      // Create backup directory
      fs.mkdirSync(backupPath);
      
      // Backup database
      const dbBackup = await this.backupDatabase();
      
      // Backup uploads
      const uploadsBackup = await this.backupUploads();
      
      // Export JSON of all tables
      const jsonBackup = await this.exportToJSON();
      
      // Create manifest
      const manifest = {
        timestamp,
        version: '1.0',
        files: {
          database: dbBackup,
          uploads: uploadsBackup,
          json: jsonBackup
        }
      };
      
      fs.writeFileSync(
        path.join(backupPath, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
      );
      
      // Create archive
      const archivePath = await this.createArchive(backupPath);
      
      // Clean up temp directory
      fs.rmSync(backupPath, { recursive: true, force: true });
      
      // Log backup
      await db.AuditLog.create({
        user_id: null,
        action: 'CREATE',
        entity_type: 'Backup',
        new_data: { path: archivePath, size: fs.statSync(archivePath).size },
        ip_address: 'system'
      });
      
      // Clean old backups (keep last 30 days)
      await this.cleanOldBackups();
      
      return {
        success: true,
        path: archivePath,
        size: fs.statSync(archivePath).size,
        timestamp
      };
    } catch (error) {
      console.error('Backup failed:', error);
      throw error;
    }
  }
  
  async backupDatabase() {
    const backupFile = path.join(this.backupDir, `db-backup-${Date.now()}.sql`);
    
    const command = `mysqldump -h ${process.env.DB_HOST} -u ${process.env.DB_USER} -p${process.env.DB_PASSWORD} ${process.env.DB_NAME} > ${backupFile}`;
    
    await execPromise(command);
    return backupFile;
  }
  
  async backupUploads() {
    const uploadsDir = path.join(__dirname, '../uploads');
    const backupFile = path.join(this.backupDir, `uploads-backup-${Date.now()}.zip`);
    
    if (fs.existsSync(uploadsDir)) {
      const command = `zip -r ${backupFile} ${uploadsDir}`;
      await execPromise(command);
    }
    
    return backupFile;
  }
  
  async exportToJSON() {
    const tables = ['Users', 'Patients', 'Appointments', 'TestingEncounters', 'TreatmentEncounters', 'AuditLogs'];
    const exports = {};
    
    for (const table of tables) {
      const model = db[table];
      if (model) {
        const data = await model.findAll();
        exports[table] = data;
      }
    }
    
    const jsonFile = path.join(this.backupDir, `json-backup-${Date.now()}.json`);
    fs.writeFileSync(jsonFile, JSON.stringify(exports, null, 2));
    
    return jsonFile;
  }
  
  async createArchive(sourcePath) {
    const archivePath = path.join(this.backupDir, `${path.basename(sourcePath)}.tar.gz`);
    const command = `tar -czf ${archivePath} -C ${path.dirname(sourcePath)} ${path.basename(sourcePath)}`;
    await execPromise(command);
    return archivePath;
  }
  
  async restoreBackup(backupFile) {
    try {
      // Extract archive
      const extractDir = path.join(this.backupDir, 'restore-temp');
      fs.mkdirSync(extractDir);
      
      const extractCommand = `tar -xzf ${backupFile} -C ${extractDir}`;
      await execPromise(extractCommand);
      
      // Read manifest
      const manifestPath = path.join(extractDir, 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      
      // Restore database
      if (manifest.files.database && fs.existsSync(manifest.files.database)) {
        const restoreCommand = `mysql -h ${process.env.DB_HOST} -u ${process.env.DB_USER} -p${process.env.DB_PASSWORD} ${process.env.DB_NAME} < ${manifest.files.database}`;
        await execPromise(restoreCommand);
      }
      
      // Restore uploads
      if (manifest.files.uploads && fs.existsSync(manifest.files.uploads)) {
        const uploadsDir = path.join(__dirname, '../uploads');
        if (fs.existsSync(uploadsDir)) {
          fs.rmSync(uploadsDir, { recursive: true, force: true });
        }
        
        const unzipCommand = `unzip ${manifest.files.uploads} -d ${path.dirname(uploadsDir)}`;
        await execPromise(unzipCommand);
      }
      
      // Clean up
      fs.rmSync(extractDir, { recursive: true, force: true });
      
      await db.AuditLog.create({
        user_id: null,
        action: 'UPDATE',
        entity_type: 'Restore',
        new_data: { backupFile },
        ip_address: 'system'
      });
      
      return { success: true, message: 'Restore completed successfully' };
    } catch (error) {
      console.error('Restore failed:', error);
      throw error;
    }
  }
  
  async listBackups() {
    const files = fs.readdirSync(this.backupDir);
    const backups = [];
    
    for (const file of files) {
      if (file.endsWith('.tar.gz')) {
        const stats = fs.statSync(path.join(this.backupDir, file));
        backups.push({
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          path: path.join(this.backupDir, file)
        });
      }
    }
    
    return backups.sort((a, b) => b.created - a.created);
  }
  
  async deleteBackup(filename) {
    const backupPath = path.join(this.backupDir, filename);
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
      return { success: true };
    }
    return { success: false, error: 'Backup not found' };
  }
  
  async cleanOldBackups(daysToKeep = 30) {
    const backups = await this.listBackups();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    for (const backup of backups) {
      if (backup.created < cutoffDate) {
        await this.deleteBackup(backup.filename);
      }
    }
  }
}

module.exports = new BackupService();