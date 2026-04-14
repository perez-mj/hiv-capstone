// backend/services/blockchainAuditService.js
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

      // Create a unique key for this audit entry
      const key = `${tableName}:${recordId || 'system'}:${Date.now()}`;
      
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
      const patientRecord = {
        patient_id: String(patientId),
        record_type: recordType, // e.g., 'MEDICAL_HISTORY', 'DEMOGRAPHICS', 'HIV_STATUS'
        record_data: recordData,
        timestamp: new Date().toISOString(),
        recorded_by: req?.user?.id || null,
        recorded_by_name: req?.user?.username || 'system',
        action: 'SNAPSHOT'
      };

      // Encrypt sensitive patient data
      const encryptedRecord = encryptionService.encryptSensitiveFields(patientRecord, 
        ['patient_id', 'record_data', 'recorded_by_name']
      );
      
      // Store hash for verification
      encryptedRecord.data_hash = encryptionService.hashData(patientRecord);

      const key = `patient:${patientId}:${recordType}:${Date.now()}`;
      
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
        data_hash: encryptedRecord.data_hash
      };
    } catch (error) {
      console.error('Failed to store patient record:', error.message);
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
        captured_by_name: req?.user?.username || 'system'
      };

      // Encrypt sensitive data (patient_id and notes)
      const encryptedSnapshot = encryptionService.encryptSensitiveFields(snapshot, 
        ['patient_id', 'notes', 'captured_by_name']
      );
      
      encryptedSnapshot.data_hash = encryptionService.hashData(snapshot);

      const key = `appointment:${appointmentData.id}:${Date.now()}`;
      
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
        timestamp: result.timestamp
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
        verified_by_id: req?.user?.id || null
      };

      // Encrypt sensitive lab data (interpretation and results)
      const encryptedLabRecord = encryptionService.encryptSensitiveFields(labRecord, 
        ['patient_id', 'result_value', 'interpretation', 'file_path']
      );
      
      encryptedLabRecord.data_hash = encryptionService.hashData(labRecord);

      const key = `lab:${labResultData.patient_id}:${labResultData.id}:${Date.now()}`;
      
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
        timestamp: result.timestamp
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
        keyPattern = `${tableName}:${recordId}`;
      } else if (tableName) {
        keyPattern = `${tableName}:`;
      } else if (patientId) {
        keyPattern = `patient:${patientId}`;
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
      let keyPattern = recordType 
        ? `patient:${patientId}:${recordType}`
        : `patient:${patientId}:`;
      
      const items = await this.client.getStreamItems(
        STREAMS.PATIENT_RECORDS,
        keyPattern,
        limit,
        offset
      );

      return items.map(item => ({
        ...encryptionService.decrypt(item.data),
        blockchain_txid: item.txid,
        blockchain_time: item.time
      }));
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
      const keyPattern = `appointment:${appointmentId}:`;
      
      const items = await this.client.getStreamItems(
        STREAMS.APPOINTMENTS,
        keyPattern,
        limit,
        0,
        true // reverse chronological
      );

      return items.map(item => ({
        ...encryptionService.decrypt(item.data),
        blockchain_txid: item.txid,
        blockchain_time: item.time
      }));
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
      let keyPattern = patientId ? `lab:${patientId}:` : 'lab:';
      
      const items = await this.client.getStreamItems(
        STREAMS.LAB_RESULTS,
        keyPattern,
        limit,
        offset,
        true // reverse chronological
      );

      return items.map(item => ({
        ...encryptionService.decrypt(item.data),
        blockchain_txid: item.txid,
        blockchain_time: item.time
      }));
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

      allLogs.forEach(log => {
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
          table: decrypted.table_name
        });
      });

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
}

module.exports = new BlockchainAuditService();