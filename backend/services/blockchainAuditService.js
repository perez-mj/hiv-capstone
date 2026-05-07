const MultiChainHTTPClient = require('../config/multichain-http');
const encryptionService = require('./encryptionService');

const STREAMS = {
  AUDIT_LOG: 'audit_logs',
  PATIENT_RECORDS: 'patient_records',
  APPOINTMENTS: 'appointments',
  LAB_RESULTS: 'lab_results'
};

class BlockchainAuditService {
  constructor() {
    this.client = null;
    this.initialized = false;
    this.enabled = false;
  }

  async initialize() {
    try {
      console.log('Initializing Blockchain Audit Service...');
      
      // Create client instance
      this.client = new MultiChainHTTPClient();
      
      // Initialize connection
      await this.client.initialize();
      
      this.initialized = true;
      this.enabled = true;
      
      // Verify streams exist
      await this.ensureStreams();
      
      console.log('✅ Blockchain audit service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize blockchain audit service:', error.message);
      this.enabled = false;
      this.initialized = false;
      this.client = null;
      console.log('⚠️  Running in fallback mode (blockchain disabled)');
      return false;
    }
  }

  async ensureStreams() {
    if (!this.client || !this.initialized) return;
    
    console.log('Verifying blockchain streams...');
    const existingStreams = await this.client.listStreams();
    const existingStreamNames = existingStreams.map(s => s.name);
    
    for (const [key, streamName] of Object.entries(STREAMS)) {
      if (!existingStreamNames.includes(streamName)) {
        console.log(`Creating stream: ${streamName}`);
        await this.client.createStream(streamName, false);
      } else {
        console.log(`✅ Stream ${streamName} exists`);
      }
    }
  }

  /**
   * Core audit logging - stores in AUDIT_LOG stream
   * Used for compliance, who did what and when
   */
  async logAction(actionType, tableName, recordId, patientId, oldValues, newValues, description, req = null) {
    if (!this.enabled || !this.initialized || !this.client) {
      console.log('[AUDIT-FALLBACK]', {
        action_type: actionType,
        table_name: tableName,
        record_id: recordId,
        patient_id: patientId,
        description: description,
        timestamp: new Date().toISOString(),
        user: req?.user?.username || 'system'
      });
      return { success: true, fallback: true };
    }

    try {
      const auditEntry = {
        action_type: actionType,
        table_name: tableName,
        record_id: String(recordId),
        patient_id: patientId ? String(patientId) : null,
        old_values: oldValues,
        new_values: newValues,
        description: description,
        timestamp: new Date().toISOString(),
        user_id: req?.user?.id || null,
        username: req?.user?.username || 'system',
        ip_address: req?.ip || req?.connection?.remoteAddress || null,
        user_agent: req?.headers?.['user-agent'] || null
      };

      // Encrypt sensitive data before storing on blockchain
      const encryptedEntry = encryptionService.encryptSensitiveFields(auditEntry);
      
      // Also store hash for integrity verification
      const dataHash = encryptionService.hashData(auditEntry);
      encryptedEntry.data_hash = dataHash;

      // Create a unique key for this audit entry (using _ instead of :)
      const key = `${tableName}_${recordId || 'system'}_${Date.now()}`;
      
      const result = await this.client.publishToStream(
        STREAMS.AUDIT_LOG,
        key,
        encryptedEntry
      );
      
      console.log(`✅ Audit logged to blockchain: ${actionType} on ${tableName} (${key})`);
      
      return {
        success: true,
        txid: result.txid,
        key: key,
        timestamp: result.timestamp,
        data_hash: dataHash
      };
    } catch (error) {
      console.error('Failed to log action to blockchain:', error.message);
      return {
        success: false,
        error: error.message,
        fallback: true
      };
    }
  }

  /**
   * Store patient record snapshot - stores in PATIENT_RECORDS stream
   * Used for immutable medical history
   */
  async storePatientRecord(patientId, recordType, recordData, req = null) {
    if (!this.enabled || !this.initialized || !this.client) {
      console.log('[PATIENT-RECORD-FALLBACK]', {
        patient_id: patientId,
        record_type: recordType,
        timestamp: new Date().toISOString()
      });
      return { success: true, fallback: true };
    }

    try {
      // Import verification service to use the same hash function
      const verificationService = require('./verificationService');
      
      // DEBUG: Log what we received
      console.log(`📝 Storing ${recordType} record for patient ${patientId}`);
      console.log(`   Record data keys: ${Object.keys(recordData).join(', ')}`);
      
      // Extract the actual patient data for hashing
      let patientDataForHash = null;
      
      // Check different possible structures
      if (recordData.enrollment_data) {
        // From patientController.createPatient
        patientDataForHash = recordData.enrollment_data;
        console.log(`   Using enrollment_data for hash`);
      } else if (recordData.snapshot_data) {
        // From verificationService.storePatientSnapshot
        patientDataForHash = recordData.snapshot_data;
        console.log(`   Using snapshot_data for hash`);
      } else if (recordData.record_data && recordData.record_data.enrollment_data) {
        // Nested structure
        patientDataForHash = recordData.record_data.enrollment_data;
        console.log(`   Using nested enrollment_data for hash`);
      } else if (recordData.record_data && recordData.record_data.snapshot_data) {
        // Nested snapshot structure
        patientDataForHash = recordData.record_data.snapshot_data;
        console.log(`   Using nested snapshot_data for hash`);
      } else if (recordData.patient_id && recordData.first_name) {
        // Direct patient data
        patientDataForHash = recordData;
        console.log(`   Using direct patient data for hash`);
      } else {
        // Fallback: try to find any patient-like data
        console.log(`   Warning: Unknown data structure, attempting to extract...`);
        patientDataForHash = recordData.record_data || recordData;
      }
      
      // Ensure we have the required fields for hash generation
      if (!patientDataForHash || !patientDataForHash.id) {
        console.error(`   ERROR: Cannot extract patient data for hashing. Patient ID: ${patientId}`);
        console.error(`   patientDataForHash:`, JSON.stringify(patientDataForHash, null, 2).substring(0, 500));
        
        // Try to fetch current patient data from database as fallback
        const pool = require('../db');
        const [patientRows] = await pool.execute(
          'SELECT * FROM patients WHERE id = ?',
          [patientId]
        );
        if (patientRows[0]) {
          patientDataForHash = patientRows[0];
          console.log(`   Using database fallback for patient data`);
        } else {
          throw new Error(`Cannot generate hash for patient ${patientId}: No patient data available`);
        }
      }
      
      // Generate hash using the SAME method as verification service
      const dataHash = verificationService.generatePatientDataHash(patientDataForHash);
      
      console.log(`   Generated hash: ${dataHash.substring(0, 16)}...`);
      console.log(`   Patient data sample: ID=${patientDataForHash.id}, Name=${patientDataForHash.first_name} ${patientDataForHash.last_name}`);
      
      const patientRecord = {
        patient_id: String(patientId),
        record_type: recordType,
        record_data: recordData,
        data_hash: dataHash,  // Store the hash of just the patient data
        timestamp: new Date().toISOString(),
        recorded_by: req?.user?.id || null,
        recorded_by_name: req?.user?.username || 'system',
        action: 'SNAPSHOT'
      };

      // Encrypt sensitive patient data
      const encryptedRecord = encryptionService.encryptSensitiveFields(patientRecord, 
        ['patient_id', 'record_data', 'recorded_by_name']
      );

      // Create key with _ instead of :
      const key = `patient_${patientId}_${recordType}_${Date.now()}`;
      
      const result = await this.client.publishToStream(
        STREAMS.PATIENT_RECORDS,
        key,
        encryptedRecord
      );
      
      console.log(`✅ Patient record stored: ${recordType} for patient ${patientId}`);
      
      return {
        success: true,
        txid: result.txid,
        key: key,
        timestamp: result.timestamp,
        data_hash: dataHash
      };
    } catch (error) {
      console.error('Failed to store patient record:', error.message);
      console.error(error.stack);
      return { success: false, error: error.message };
    }
  }

  /**
   * Store appointment snapshot - stores in APPOINTMENTS stream
   * Used for tracking appointment state history
   */
  async storeAppointmentSnapshot(appointmentData, action = 'CREATE', req = null) {
    if (!this.enabled || !this.initialized || !this.client) {
      console.log('[APPOINTMENT-SNAPSHOT-FALLBACK]', {
        appointment_id: appointmentData?.id,
        action: action,
        timestamp: new Date().toISOString()
      });
      return { success: true, fallback: true };
    }

    try {
      const verificationService = require('./verificationService');
      const dataHash = verificationService.generateAppointmentHash(appointmentData);
      
      const snapshot = {
        appointment_id: appointmentData.id,
        appointment_number: appointmentData.appointment_number,
        patient_id: String(appointmentData.patient_id),
        appointment_type_id: appointmentData.appointment_type_id,
        scheduled_at: appointmentData.scheduled_at,
        status: appointmentData.status,
        notes: appointmentData.notes,
        snapshot_action: action, // CREATE, UPDATE, STATUS_CHANGE, COMPLETE, CANCEL
        snapshot_time: new Date().toISOString(),
        captured_by: req?.user?.id || null,
        captured_by_name: req?.user?.username || 'system',
        data_hash: dataHash
      };

      // Encrypt sensitive data (patient_id and notes)
      const encryptedSnapshot = encryptionService.encryptSensitiveFields(snapshot, 
        ['patient_id', 'notes', 'captured_by_name']
      );

      // Create key with _ instead of :
      const key = `appointment_${appointmentData.id}_${Date.now()}`;
      
      const result = await this.client.publishToStream(
        STREAMS.APPOINTMENTS,
        key,
        encryptedSnapshot
      );
      
      console.log(`✅ Appointment snapshot stored: ${action} for appointment ${appointmentData.id}`);
      
      return {
        success: true,
        txid: result.txid,
        key: key,
        timestamp: result.timestamp,
        data_hash: dataHash
      };
    } catch (error) {
      console.error('Failed to store appointment snapshot:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Store lab result - stores in LAB_RESULTS stream
   * Used for immutable lab result storage
   */
  async storeLabResult(labResultData, req = null) {
    if (!this.enabled || !this.initialized || !this.client) {
      console.log('[LAB-RESULT-FALLBACK]', {
        lab_result_id: labResultData?.id,
        patient_id: labResultData?.patient_id,
        timestamp: new Date().toISOString()
      });
      return { success: true, fallback: true };
    }

    try {
      const verificationService = require('./verificationService');
      const dataHash = verificationService.generateLabResultHash(labResultData);
      
      const labRecord = {
        lab_result_id: labResultData.id,
        patient_id: String(labResultData.patient_id),
        appointment_id: labResultData.appointment_id,
        test_type: labResultData.test_type,
        test_date: labResultData.test_date,
        result_value: labResultData.result_value,
        result_unit: labResultData.result_unit,
        reference_range: labResultData.reference_range,
        interpretation: labResultData.interpretation,
        file_path: labResultData.file_path,
        performed_by: labResultData.performed_by,
        blockchain_timestamp: new Date().toISOString(),
        verified_by: req?.user?.username || 'system',
        verified_by_id: req?.user?.id || null,
        data_hash: dataHash
      };

      // Encrypt sensitive lab data (interpretation and results)
      const encryptedLabRecord = encryptionService.encryptSensitiveFields(labRecord, 
        ['patient_id', 'result_value', 'interpretation', 'file_path']
      );

      // Create key with _ instead of :
      const key = `lab_${labResultData.patient_id}_${labResultData.id}_${Date.now()}`;
      
      const result = await this.client.publishToStream(
        STREAMS.LAB_RESULTS,
        key,
        encryptedLabRecord
      );
      
      console.log(`✅ Lab result stored: ${labResultData.test_type} for patient ${labResultData.patient_id}`);
      
      return {
        success: true,
        txid: result.txid,
        key: key,
        timestamp: result.timestamp,
        data_hash: dataHash
      };
    } catch (error) {
      console.error('Failed to store lab result:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify data integrity using stored hash
   */
  async verifyDataIntegrity(streamName, txid, originalData) {
    if (!this.enabled || !this.initialized || !this.client) {
      return { verified: false, error: 'Blockchain disabled' };
    }
    
    try {
      const tx = await this.client.getTransaction(txid);
      if (!tx || !tx.data) {
        return { verified: false, error: 'Transaction not found' };
      }
      
      const storedHash = tx.data.data_hash;
      const computedHash = encryptionService.hashData(originalData);
      
      return {
        verified: storedHash === computedHash,
        stored_hash: storedHash,
        computed_hash: computedHash,
        txid: txid
      };
    } catch (error) {
      console.error('Failed to verify integrity:', error.message);
      return { verified: false, error: error.message };
    }
  }

  /**
   * Get audit trail with decryption
   */
  async getAuditTrail(tableName = null, recordId = null, patientId = null, limit = 100, offset = 0) {
    if (!this.enabled || !this.initialized || !this.client) {
      console.log('[AUDIT-FALLBACK] Returning empty audit trail (blockchain disabled)');
      return [];
    }

    try {
      let keyPattern = null;
      if (tableName && recordId) {
        keyPattern = `${tableName}_${recordId}`;
      } else if (tableName) {
        keyPattern = `${tableName}_`;
      } else if (patientId) {
        keyPattern = `patient_${patientId}`;
      }

      const items = await this.client.getStreamItems(
        STREAMS.AUDIT_LOG,
        keyPattern,
        limit,
        offset
      );

      // Decrypt sensitive data
      return items.map(item => ({
        ...encryptionService.decrypt(item.data),
        blockchain_txid: item.txid,
        blockchain_time: item.time,
        confirmations: item.confirmations
      }));
    } catch (error) {
      console.error('Failed to get audit trail:', error.message);
      return [];
    }
  }

  /**
   * Get patient records from blockchain
   */
  async getPatientRecords(patientId, recordType = null, limit = 100, offset = 0) {
    if (!this.enabled || !this.initialized || !this.client) {
      return [];
    }

    try {
      // Use key pattern with _ instead of :
      let keyPattern = `patient_${patientId}_`;
      if (recordType) {
        keyPattern = `patient_${patientId}_${recordType}_`;
      }
      
      const items = await this.client.getStreamItems(
        STREAMS.PATIENT_RECORDS,
        keyPattern,
        limit,
        offset
      );

      const decryptedResults = items.map(item => {
        const decrypted = encryptionService.decrypt(item.data);
        return {
          ...decrypted,
          blockchain_txid: item.txid,
          blockchain_time: item.time,
          confirmations: item.confirmations
        };
      });
      
      console.log(`📦 Retrieved ${decryptedResults.length} patient records from blockchain`);
      
      return decryptedResults;
    } catch (error) {
      console.error('Failed to get patient records:', error.message);
      return [];
    }
  }

  /**
   * Get appointment history from blockchain
   */
  async getAppointmentHistory(appointmentId, limit = 100) {
    if (!this.enabled || !this.initialized || !this.client) {
      return [];
    }

    try {
      // Use key pattern with _ instead of :
      let keyPattern = appointmentId ? `appointment_${appointmentId}_` : 'appointment_';
      
      const items = await this.client.getStreamItems(
        STREAMS.APPOINTMENTS,
        keyPattern,
        limit,
        0,
        true // reverse chronological
      );

      const decryptedItems = items.map(item => ({
        ...encryptionService.decrypt(item.data),
        blockchain_txid: item.txid,
        blockchain_time: item.time,
        confirmations: item.confirmations
      }));
      
      console.log(`📅 Retrieved ${decryptedItems.length} appointment records${appointmentId ? ` for appointment ${appointmentId}` : ''}`);
      
      return decryptedItems;
    } catch (error) {
      console.error('Failed to get appointment history:', error.message);
      return [];
    }
  }

  /**
   * Get lab results from blockchain
   */
  async getLabResults(patientId = null, limit = 100, offset = 0) {
    if (!this.enabled || !this.initialized || !this.client) {
      return [];
    }

    try {
      // Use key pattern with _ instead of :
      let keyPattern = patientId ? `lab_${patientId}_` : 'lab_';
      
      const items = await this.client.getStreamItems(
        STREAMS.LAB_RESULTS,
        keyPattern,
        limit,
        offset,
        true // reverse chronological
      );

      const decryptedItems = items.map(item => ({
        ...encryptionService.decrypt(item.data),
        blockchain_txid: item.txid,
        blockchain_time: item.time,
        confirmations: item.confirmations
      }));
      
      console.log(`🔬 Retrieved ${decryptedItems.length} lab results${patientId ? ` for patient ${patientId}` : ''}`);
      
      return decryptedItems;
    } catch (error) {
      console.error('Failed to get lab results:', error.message);
      return [];
    }
  }

  async verifyAuditIntegrity(txid) {
    if (!this.enabled || !this.initialized || !this.client) {
      return { verified: false, error: 'Blockchain disabled' };
    }
    return await this.client.verifyTransaction(txid);
  }

  async getAuditStatistics() {
    if (!this.enabled || !this.initialized || !this.client) {
      return { error: 'Blockchain disabled' };
    }
    
    try {
      const allLogs = await this.client.getStreamItems(STREAMS.AUDIT_LOG, null, 1000, 0);
      
      const stats = {
        total_entries: allLogs.length,
        by_action_type: {},
        by_table: {},
        by_user: {},
        timeline: []
      };

      for (const log of allLogs) {
        const decrypted = encryptionService.decrypt(log.data);
        const actionType = decrypted.action_type;
        stats.by_action_type[actionType] = (stats.by_action_type[actionType] || 0) + 1;
        
        const table = decrypted.table_name;
        stats.by_table[table] = (stats.by_table[table] || 0) + 1;
        
        const username = decrypted.username;
        stats.by_user[username] = (stats.by_user[username] || 0) + 1;
        
        stats.timeline.push({
          date: decrypted.timestamp,
          action: decrypted.action_type,
          table: decrypted.table_name,
          txid: log.txid
        });
      }

      return stats;
    } catch (error) {
      console.error('Failed to get audit statistics:', error.message);
      return { error: error.message };
    }
  }

  async listStreams() {
    if (!this.enabled || !this.initialized || !this.client) {
      return [];
    }
    return await this.client.listStreams();
  }

  /**
   * Get blockchain status
   */
  async getBlockchainStatus() {
    if (!this.enabled || !this.initialized || !this.client) {
      return { enabled: false, initialized: false, message: 'Blockchain service is disabled' };
    }
    
    try {
      const info = await this.client.getBlockchainInfo();
      return {
        enabled: true,
        initialized: true,
        blockchain_name: info.chainname,
        block_count: info.blocks,
        connections: info.connections,
        version: info.version
      };
    } catch (error) {
      console.error('Failed to get blockchain status:', error.message);
      return { enabled: true, initialized: true, error: error.message };
    }
  }
}

module.exports = new BlockchainAuditService();