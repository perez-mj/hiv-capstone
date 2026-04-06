const MultiChainHTTPClient = require('../config/multichain-http');

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

  async logAction(actionType, tableName, recordId, patientId, oldValues, newValues, description, req = null) {
    // If blockchain is not enabled, just log to console for debugging
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

      // Create a unique key for this audit entry
      const key = `${tableName}:${recordId || 'system'}:${Date.now()}`;
      
      const result = await this.client.publishToStream(
        STREAMS.AUDIT_LOG,
        key,
        auditEntry
      );
      
      console.log(`✅ Audit logged to blockchain: ${actionType} on ${tableName} (${key})`);
      
      return {
        success: true,
        txid: result.txid,
        key: key,
        timestamp: result.timestamp
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

      return items.map(item => ({
        ...item.data,
        blockchain_txid: item.txid,
        blockchain_time: item.time,
        confirmations: item.confirmations
      }));
    } catch (error) {
      console.error('Failed to get audit trail:', error.message);
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
        const actionType = log.data.action_type;
        stats.by_action_type[actionType] = (stats.by_action_type[actionType] || 0) + 1;
        
        const table = log.data.table_name;
        stats.by_table[table] = (stats.by_table[table] || 0) + 1;
        
        const username = log.data.username;
        stats.by_user[username] = (stats.by_user[username] || 0) + 1;
        
        stats.timeline.push({
          date: log.data.timestamp,
          action: log.data.action_type,
          table: log.data.table_name
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