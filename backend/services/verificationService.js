// backend/services/verificationService.js
const crypto = require('crypto');
const blockchainAuditService = require('./blockchainAuditService');
const encryptionService = require('./encryptionService');
const pool = require('../db');

class VerificationService {
  constructor() {
    this.verificationCache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
  }

  /**
   * Generate a hash of patient data for comparison
   */
  generatePatientDataHash(patientData) {
    const normalizedData = {
      id: patientData.id,
      patient_facility_code: patientData.patient_facility_code,
      first_name: patientData.first_name,
      last_name: patientData.last_name,
      middle_name: patientData.middle_name,
      date_of_birth: patientData.date_of_birth,
      sex: patientData.sex,
      address: patientData.address,
      contact_number: patientData.contact_number,
      hiv_status: patientData.hiv_status,
      diagnosis_date: patientData.diagnosis_date,
      art_start_date: patientData.art_start_date,
      latest_cd4_count: patientData.latest_cd4_count,
      latest_viral_load: patientData.latest_viral_load,
      updated_at: patientData.updated_at
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(normalizedData, Object.keys(normalizedData).sort()))
      .digest('hex');
  }

  /**
   * Generate hash for lab result
   */
  generateLabResultHash(labResult) {
    const normalizedData = {
      id: labResult.id,
      patient_id: labResult.patient_id,
      test_type: labResult.test_type,
      test_date: labResult.test_date,
      result_value: labResult.result_value,
      result_unit: labResult.result_unit,
      reference_range: labResult.reference_range,
      interpretation: labResult.interpretation
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(normalizedData, Object.keys(normalizedData).sort()))
      .digest('hex');
  }

  /**
   * Generate hash for appointment
   */
  generateAppointmentHash(appointment) {
    const normalizedData = {
      id: appointment.id,
      patient_id: appointment.patient_id,
      appointment_type_id: appointment.appointment_type_id,
      scheduled_at: appointment.scheduled_at,
      status: appointment.status,
      notes: appointment.notes
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(normalizedData, Object.keys(normalizedData).sort()))
      .digest('hex');
  }

  /**
   * Verify a single patient's data integrity
   */
  async verifyPatientIntegrity(patientId) {
    const results = {
      patient_id: patientId,
      verified_at: new Date().toISOString(),
      overall_integrity: true,
      checks: {
        demographic: { verified: false, message: '', blockchain_records: 0, matches: 0 },
        medical: { verified: false, message: '', blockchain_records: 0, matches: 0 },
        lab_results: { verified: false, message: '', total: 0, verified: 0, failed: [] },
        appointments: { verified: false, message: '', total: 0, verified: 0, failed: [] }
      },
      tamper_alerts: [],
      recommendations: []
    };

    try {
      // Get current patient data from database
      const [patientRows] = await pool.execute(
        `SELECT p.*, 
          u.username as user_username,
          u.email as user_email
         FROM patients p
         LEFT JOIN users u ON p.user_id = u.id
         WHERE p.id = ?`,
        [patientId]
      );

      if (!patientRows[0]) {
        results.overall_integrity = false;
        results.tamper_alerts.push({
          severity: 'critical',
          message: 'Patient record not found in database',
          timestamp: new Date().toISOString()
        });
        return results;
      }

      const currentPatient = patientRows[0];
      const currentHash = this.generatePatientDataHash(currentPatient);

      console.log(`🔍 Verifying patient ${patientId} with hash: ${currentHash.substring(0, 16)}...`);

      // Get blockchain records for this patient
      const blockchainRecords = await blockchainAuditService.getPatientRecords(
        patientId,
        null,
        100,
        0
      );

      console.log(`📦 Found ${blockchainRecords.length} blockchain records for patient ${patientId}`);

      // ==================== DEMOGRAPHIC VERIFICATION ====================
      if (blockchainRecords.length === 0) {
        results.checks.demographic.message = 'No blockchain records found for verification';
        results.checks.demographic.verified = false;
        results.tamper_alerts.push({
          severity: 'warning',
          message: 'No blockchain records exist for this patient. Data cannot be verified.',
          timestamp: new Date().toISOString()
        });
        results.recommendations.push('Store current patient snapshot to blockchain for future verification');
      } else {
        results.checks.demographic.blockchain_records = blockchainRecords.length;

        // Verify demographic and medical data
        let matchCount = 0;
        let verifiedRecords = [];
        
        for (const record of blockchainRecords) {
          // Skip DELETION records for hash comparison
          if (record.record_type === 'DELETION') {
            console.log(`⏭️ Skipping DELETION record for patient ${patientId}`);
            continue;
          }
          
          // Compare the stored hash with current patient hash
          if (record.data_hash === currentHash) {
            matchCount++;
            verifiedRecords.push({
              type: record.record_type,
              txid: record.blockchain_txid,
              time: record.blockchain_time
            });
            console.log(`✅ Hash match found for record type: ${record.record_type}`);
          } else {
            console.log(`❌ Hash mismatch for ${record.record_type}:`, {
              stored: record.data_hash ? record.data_hash.substring(0, 16) + '...' : 'missing',
              current: currentHash.substring(0, 16) + '...'
            });
          }
        }

        results.checks.demographic.matches = matchCount;
        results.checks.demographic.verified = matchCount > 0;
        results.checks.demographic.message = matchCount > 0 
          ? `Verified against ${matchCount} blockchain record(s)`
          : 'No matching blockchain records found';
        
        if (verifiedRecords.length > 0) {
          results.checks.demographic.verified_records = verifiedRecords;
        }
      }

      // ==================== MEDICAL VERIFICATION ====================
      // Medical data is already covered by the demographic hash since it includes medical fields
      const medicalRecords = blockchainRecords.filter(r => 
        r.record_type === 'MEDICAL_UPDATE' || r.record_type === 'HIV_STATUS_CHANGE'
      );
      results.checks.medical.blockchain_records = medicalRecords.length;

      if (results.checks.demographic.verified) {
        // If demographic is verified, medical data is automatically verified
        results.checks.medical.verified = true;
        results.checks.medical.message = 'Medical data verified (included in demographic record)';
      } else if (medicalRecords.length === 0 && results.checks.demographic.blockchain_records > 0) {
        // No medical-specific records, but demographic is verified
        results.checks.medical.verified = true;
        results.checks.medical.message = 'No medical updates recorded - data integrity verified through enrollment record';
      } else if (medicalRecords.length > 0) {
        // Check if any medical records match
        let medicalMatchCount = 0;
        for (const record of medicalRecords) {
          if (record.data_hash === currentHash) {
            medicalMatchCount++;
          }
        }
        results.checks.medical.verified = medicalMatchCount > 0;
        results.checks.medical.message = medicalMatchCount > 0 
          ? `Verified against ${medicalMatchCount} medical record(s)`
          : 'Medical record verification failed';
      } else {
        results.checks.medical.verified = true;
        results.checks.medical.message = 'No medical records to verify';
      }

      // ==================== LAB RESULTS VERIFICATION ====================
      const [labResults] = await pool.execute(
        `SELECT * FROM lab_results WHERE patient_id = ?`,
        [patientId]
      );

      results.checks.lab_results.total = labResults.length;
      
      if (labResults.length > 0) {
        const blockchainLabResults = await blockchainAuditService.getLabResults(patientId, 100, 0);
        const blockchainLabMap = new Map();
        
        blockchainLabResults.forEach(record => {
          if (record.lab_result_id) {
            blockchainLabMap.set(record.lab_result_id, record);
          }
        });

        let verifiedCount = 0;
        for (const lab of labResults) {
          const blockchainRecord = blockchainLabMap.get(lab.id);
          if (blockchainRecord) {
            const currentLabHash = this.generateLabResultHash(lab);
            if (blockchainRecord.data_hash === currentLabHash) {
              verifiedCount++;
            } else {
              results.checks.lab_results.failed.push({
                id: lab.id,
                test_type: lab.test_type,
                message: 'Hash mismatch - possible tampering detected',
                database_hash: currentLabHash,
                blockchain_hash: blockchainRecord.data_hash
              });
            }
          } else {
            results.checks.lab_results.failed.push({
              id: lab.id,
              test_type: lab.test_type,
              message: 'No blockchain record found for this lab result'
            });
          }
        }
        
        results.checks.lab_results.verified_count = verifiedCount;
        results.checks.lab_results.verified = verifiedCount === labResults.length;
        
        if (verifiedCount !== labResults.length) {
          results.tamper_alerts.push({
            severity: 'high',
            message: `${labResults.length - verifiedCount} lab result(s) failed verification`,
            timestamp: new Date().toISOString(),
            failed_items: results.checks.lab_results.failed
          });
        }
      } else {
        results.checks.lab_results.verified = true;
        results.checks.lab_results.message = 'No lab results to verify';
      }

      // ==================== APPOINTMENTS VERIFICATION ====================
      const [appointments] = await pool.execute(
        `SELECT * FROM appointments WHERE patient_id = ?`,
        [patientId]
      );

      results.checks.appointments.total = appointments.length;
      
      if (appointments.length > 0) {
        const blockchainAppointments = await blockchainAuditService.getAppointmentHistory(null, 200);
        const blockchainAppMap = new Map();
        
        blockchainAppointments.forEach(record => {
          if (record.appointment_id) {
            blockchainAppMap.set(record.appointment_id, record);
          }
        });

        let verifiedCount = 0;
        for (const apt of appointments) {
          const blockchainRecord = blockchainAppMap.get(apt.id);
          if (blockchainRecord) {
            const currentAptHash = this.generateAppointmentHash(apt);
            if (blockchainRecord.data_hash === currentAptHash) {
              verifiedCount++;
            } else {
              results.checks.appointments.failed.push({
                id: apt.id,
                status: apt.status,
                scheduled_at: apt.scheduled_at,
                message: 'Hash mismatch - possible tampering detected'
              });
            }
          } else {
            // Check if there are blockchain records for this appointment by key pattern
            const aptHistory = await blockchainAuditService.getAppointmentHistory(apt.id, 10);
            if (aptHistory.length > 0) {
              // Found by appointment ID, check latest
              const latestRecord = aptHistory[0];
              const currentAptHash = this.generateAppointmentHash(apt);
              if (latestRecord.data_hash === currentAptHash) {
                verifiedCount++;
              } else {
                results.checks.appointments.failed.push({
                  id: apt.id,
                  status: apt.status,
                  message: 'Hash mismatch with latest blockchain record'
                });
              }
            } else {
              results.checks.appointments.failed.push({
                id: apt.id,
                status: apt.status,
                message: 'No blockchain record found for this appointment'
              });
            }
          }
        }
        
        results.checks.appointments.verified_count = verifiedCount;
        results.checks.appointments.verified = verifiedCount === appointments.length;
        
        if (verifiedCount !== appointments.length) {
          results.tamper_alerts.push({
            severity: 'medium',
            message: `${appointments.length - verifiedCount} appointment(s) failed verification`,
            timestamp: new Date().toISOString()
          });
        }
      } else {
        results.checks.appointments.verified = true;
        results.checks.appointments.message = 'No appointments to verify';
      }

      // ==================== OVERALL INTEGRITY ====================
      const allChecksPass = 
        results.checks.demographic.verified !== false &&
        results.checks.medical.verified !== false &&
        results.checks.lab_results.verified &&
        results.checks.appointments.verified;

      results.overall_integrity = allChecksPass && results.tamper_alerts.length === 0;
      
      // Generate recommendations
      if (!results.checks.demographic.verified || results.checks.demographic.blockchain_records === 0) {
        results.recommendations.push('Store current patient snapshot to blockchain');
      }
      
      if (results.checks.demographic.blockchain_records > 0 && results.checks.demographic.matches === 0) {
        results.recommendations.push('Patient data has changed since last blockchain snapshot. Store a new snapshot.');
      }
      
      if (results.checks.lab_results.failed && results.checks.lab_results.failed.length > 0) {
        results.recommendations.push('Review lab results and store corrected versions to blockchain');
      }
      
      if (results.checks.appointments.failed && results.checks.appointments.failed.length > 0) {
        results.recommendations.push('Review appointment records and synchronize with blockchain');
      }

      if (results.tamper_alerts.length > 0) {
        results.recommendations.push('Investigate tamper alerts and consider restoring from blockchain backup');
      }

      // Log verification summary
      console.log(`📊 Verification summary for patient ${patientId}:`, {
        overall_integrity: results.overall_integrity,
        demographic: { verified: results.checks.demographic.verified, records: results.checks.demographic.blockchain_records, matches: results.checks.demographic.matches },
        medical: { verified: results.checks.medical.verified, records: results.checks.medical.blockchain_records },
        lab_results: { verified: results.checks.lab_results.verified, total: results.checks.lab_results.total },
        appointments: { verified: results.checks.appointments.verified, total: results.checks.appointments.total },
        tamper_alerts: results.tamper_alerts.length
      });

      // Cache the result
      this.cacheVerificationResult(patientId, results);
      
      return results;
    } catch (error) {
      console.error('Error verifying patient integrity:', error);
      results.overall_integrity = false;
      results.tamper_alerts.push({
        severity: 'error',
        message: `Verification failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      return results;
    }
  }

  /**
   * Verify all patients (batch verification)
   */
  async verifyAllPatients(options = {}) {
    const { limit = 100, offset = 0, onlySuspicious = false } = options;
    
    const results = {
      started_at: new Date().toISOString(),
      total_verified: 0,
      passed: 0,
      failed: 0,
      patients: [],
      summary: {
        tamper_alerts_count: 0,
        by_severity: { low: 0, medium: 0, high: 0, critical: 0, error: 0, warning: 0 }
      }
    };

    try {
      let query = 'SELECT id, first_name, last_name, patient_facility_code FROM patients';
      const params = [];
      
      if (onlySuspicious) {
        // Get patients that have blockchain records but might be suspicious
        query += ` WHERE id IN (
          SELECT DISTINCT patient_id FROM patients 
          WHERE updated_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
        )`;
      }
      
      query += ` LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
      
      const [patients] = await pool.execute(query, params);
      
      for (const patient of patients) {
        const verification = await this.verifyPatientIntegrity(patient.id);
        results.total_verified++;
        
        if (verification.overall_integrity) {
          results.passed++;
        } else {
          results.failed++;
        }
        
        results.patients.push({
          id: patient.id,
          name: `${patient.first_name} ${patient.last_name}`,
          facility_code: patient.patient_facility_code,
          overall_integrity: verification.overall_integrity,
          tamper_alerts_count: verification.tamper_alerts.length,
          tamper_alerts: verification.tamper_alerts.slice(0, 5) // First 5 alerts
        });
        
        // Count alerts by severity
        for (const alert of verification.tamper_alerts) {
          results.summary.tamper_alerts_count++;
          if (results.summary.by_severity[alert.severity]) {
            results.summary.by_severity[alert.severity]++;
          } else {
            results.summary.by_severity[alert.severity] = 1;
          }
        }
      }
      
      results.completed_at = new Date().toISOString();
      results.duration_ms = new Date(results.completed_at) - new Date(results.started_at);
      
      return results;
    } catch (error) {
      console.error('Error in batch verification:', error);
      throw error;
    }
  }

  /**
   * Store current patient snapshot to blockchain for future verification
   */
  async storePatientSnapshot(patientId, req = null) {
    try {
      const [patientRows] = await pool.execute(
        `SELECT p.*, 
          u.username as user_username,
          u.email as user_email
         FROM patients p
         LEFT JOIN users u ON p.user_id = u.id
         WHERE p.id = ?`,
        [patientId]
      );

      if (!patientRows[0]) {
        throw new Error('Patient not found');
      }

      const patient = patientRows[0];
      const currentHash = this.generatePatientDataHash(patient);

      const result = await blockchainAuditService.storePatientRecord(
        patientId,
        'VERIFICATION_SNAPSHOT',
        {
          action: 'VERIFICATION_SNAPSHOT',
          patient_id: patientId,
          snapshot_data: patient,
          data_hash: currentHash,
          timestamp: new Date().toISOString(),
          triggered_by: req?.user?.username || 'system'
        },
        req
      );

      return {
        success: true,
        message: 'Patient snapshot stored successfully',
        txid: result.txid,
        data_hash: currentHash
      };
    } catch (error) {
      console.error('Error storing patient snapshot:', error);
      throw error;
    }
  }

  /**
   * Get verification history for a patient
   */
  async getVerificationHistory(patientId, limit = 20) {
    try {
      const blockchainRecords = await blockchainAuditService.getPatientRecords(
        patientId,
        'VERIFICATION_SNAPSHOT',
        limit,
        0
      );

      return blockchainRecords.map(record => ({
        timestamp: record.blockchain_time,
        txid: record.blockchain_txid,
        data_hash: record.data_hash,
        triggered_by: record.record_data?.triggered_by || 'unknown',
        snapshot_time: record.record_data?.timestamp
      }));
    } catch (error) {
      console.error('Error getting verification history:', error);
      return [];
    }
  }

  /**
   * Compare two patient records for discrepancies
   */
  comparePatientRecords(record1, record2) {
    const differences = [];
    const fieldsToCompare = [
      'first_name', 'last_name', 'middle_name', 'date_of_birth', 'sex',
      'address', 'contact_number', 'hiv_status', 'diagnosis_date',
      'art_start_date', 'latest_cd4_count', 'latest_viral_load'
    ];

    for (const field of fieldsToCompare) {
      const val1 = record1[field];
      const val2 = record2[field];
      
      if (val1 !== val2) {
        differences.push({
          field,
          database_value: val1,
          blockchain_value: val2
        });
      }
    }

    return differences;
  }

  /**
   * Cache verification results
   */
  cacheVerificationResult(patientId, result) {
    this.verificationCache.set(patientId, {
      result,
      timestamp: Date.now()
    });
    
    // Clean up old cache entries
    setTimeout(() => {
      this.verificationCache.delete(patientId);
    }, this.cacheTimeout);
  }

  /**
   * Get cached verification result
   */
  getCachedVerification(patientId) {
    const cached = this.verificationCache.get(patientId);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.result;
    }
    return null;
  }

  /**
   * Clear verification cache
   */
  clearCache() {
    this.verificationCache.clear();
  }
}

module.exports = new VerificationService();