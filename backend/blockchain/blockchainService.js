// backend/blockchain/blockchainService.js
const blockchain = require('./simpleBlockchain');
const crypto = require('crypto');

// Add MultiChain support
let multichain = null;
let isMultiChainEnabled = false;

try {
  // Only try to load MultiChain if environment variable is set
  if (process.env.BLOCKCHAIN_TYPE === 'multichain') {
    multichain = require('./multichainConnector');
    isMultiChainEnabled = true;
    console.log('🔗 MultiChain connector loaded');
  }
} catch (error) {
  console.log('⚠️ MultiChain not available, using simulated blockchain');
  isMultiChainEnabled = false;
}

class BlockchainService {
  constructor() {
    this.blockchain = blockchain;
  }

  generateHash(data) {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  async recordPatient(patientData) {
    const blockData = {
      entity_type: 'patient',
      entity_id: patientData.id,
      action: 'CREATE',
      patient_facility_code: patientData.patient_facility_code,
      first_name: patientData.first_name,
      last_name: patientData.last_name,
      date_of_birth: patientData.date_of_birth,
      sex: patientData.sex,
      hiv_status: patientData.hiv_status,
      created_at: patientData.created_at,
      data_hash: this.generateHash(patientData)
    };
    
    // If MultiChain is enabled, also publish to MultiChain
    if (isMultiChainEnabled && multichain) {
      try {
        await multichain.createStream('patients');
        await multichain.publishToStream('patients', `patient:${patientData.id}`, blockData, {
          timestamp: new Date().toISOString(),
          userId: patientData.created_by
        });
        console.log(`✅ Patient recorded to MultiChain stream: patient:${patientData.id}`);
      } catch (error) {
        console.error('⚠️ MultiChain record failed:', error.message);
        // Continue with simulated blockchain
      }
    }
    
    // Always record to simulated blockchain
    const block = this.blockchain.addBlock(blockData, patientData.created_by);
    console.log(`✅ Patient recorded to simulated blockchain at block ${block.index}`);
    return block;
  }

  async recordAppointment(appointmentData) {
    const blockData = {
      entity_type: 'appointment',
      entity_id: appointmentData.id,
      action: 'CREATE',
      appointment_number: appointmentData.appointment_number,
      patient_id: appointmentData.patient_id,
      appointment_type_id: appointmentData.appointment_type_id,
      scheduled_at: appointmentData.scheduled_at,
      status: appointmentData.status,
      created_at: appointmentData.created_at,
      data_hash: this.generateHash(appointmentData)
    };
    
    if (isMultiChainEnabled && multichain) {
      try {
        await multichain.createStream('appointments');
        await multichain.publishToStream('appointments', `appointment:${appointmentData.id}`, blockData, {
          timestamp: new Date().toISOString(),
          userId: appointmentData.created_by
        });
        console.log(`✅ Appointment recorded to MultiChain stream: appointment:${appointmentData.id}`);
      } catch (error) {
        console.error('⚠️ MultiChain record failed:', error.message);
      }
    }
    
    const block = this.blockchain.addBlock(blockData, appointmentData.created_by);
    console.log(`✅ Appointment recorded to simulated blockchain at block ${block.index}`);
    return block;
  }

  async recordLabResult(labData) {
    const blockData = {
      entity_type: 'lab_result',
      entity_id: labData.id,
      action: 'CREATE',
      patient_id: labData.patient_id,
      test_type: labData.test_type,
      test_date: labData.test_date,
      result_value: labData.result_value,
      result_unit: labData.result_unit,
      interpretation: labData.interpretation,
      created_at: labData.created_at,
      data_hash: this.generateHash(labData)
    };
    
    if (isMultiChainEnabled && multichain) {
      try {
        await multichain.createStream('lab_results');
        await multichain.publishToStream('lab_results', `lab:${labData.id}`, blockData, {
          timestamp: new Date().toISOString(),
          userId: labData.performed_by
        });
        console.log(`✅ Lab result recorded to MultiChain stream: lab:${labData.id}`);
      } catch (error) {
        console.error('⚠️ MultiChain record failed:', error.message);
      }
    }
    
    const block = this.blockchain.addBlock(blockData, labData.performed_by);
    console.log(`✅ Lab result recorded to simulated blockchain at block ${block.index}`);
    return block;
  }

  async recordAuditLog(auditData) {
    const blockData = {
      entity_type: 'audit',
      entity_id: auditData.id,
      action: auditData.action_type,
      user_id: auditData.user_id,
      table_name: auditData.table_name,
      description: auditData.description,
      timestamp: auditData.timestamp,
      data_hash: this.generateHash(auditData)
    };
    
    if (isMultiChainEnabled && multichain) {
      try {
        await multichain.createStream('audit_logs');
        await multichain.publishToStream('audit_logs', `audit:${auditData.id}`, blockData, {
          timestamp: new Date().toISOString(),
          userId: auditData.user_id
        });
      } catch (error) {
        console.error('⚠️ MultiChain audit record failed:', error.message);
      }
    }
    
    const block = this.blockchain.addBlock(blockData, auditData.user_id);
    return block;
  }

  async getPatientHistory(patientId) {
    const history = this.blockchain.getBlocksByEntity('patient', patientId);
    
    // If MultiChain is enabled, also fetch from there
    if (isMultiChainEnabled && multichain) {
      try {
        const streamItems = await multichain.listStreamItems('patients');
        const patientStreams = streamItems.filter(item => 
          item.keys && item.keys.includes(`patient:${patientId}`)
        );
        if (patientStreams.length > 0) {
          return {
            simulated: history,
            multichain: patientStreams
          };
        }
      } catch (error) {
        console.error('MultiChain fetch error:', error.message);
      }
    }
    
    return history;
  }

  async verifyPatient(patientId, patientData) {
    const history = await this.getPatientHistory(patientId);
    
    if (history.simulated && history.simulated.length === 0 && 
        (!history.multichain || history.multichain.length === 0)) {
      return { verified: false, reason: 'No blockchain record found' };
    }
    
    const currentHash = this.generateHash(patientData);
    let verified = false;
    let block = null;
    
    // Check simulated blockchain
    if (history.simulated && history.simulated.length > 0) {
      const latestBlock = history.simulated[history.simulated.length - 1];
      const storedHash = latestBlock.data.data_hash;
      verified = currentHash === storedHash;
      block = latestBlock;
    }
    
    return {
      verified,
      block,
      blockchain_valid: this.blockchain.isChainValid(),
      multichain_records: history.multichain ? history.multichain.length : 0
    };
  }

  async getStats() {
    // Try MultiChain first if enabled
    if (isMultiChainEnabled && multichain) {
      try {
        const info = await multichain.getInfo();
        return {
          type: 'multichain',
          total_blocks: info.blocks,
          is_valid: { valid: true },
          version: info.version,
          chain: info.chainname,
          node_address: info.nodeaddress,
          streams: info.streams,
          connections: info.connections,
          difficulty: info.difficulty
        };
      } catch (error) {
        console.error('MultiChain error:', error.message);
        // Fallback to simulated
      }
    }
    
    // Fallback to simulated blockchain
    const stats = this.blockchain.getStats();
    return {
      type: 'simulated',
      total_blocks: stats.total_blocks || 1,
      genesis_block: stats.genesis_block,
      latest_block: stats.latest_block,
      is_valid: stats.is_valid,
      blocks_by_type: stats.blocks_by_type || {}
    };
  }

  async exportBlockchain() {
    return this.blockchain.exportChain();
  }

  async getInfo() {
    const stats = await this.getStats();
    return {
      name: 'HIV Health System Blockchain',
      version: '1.0.0',
      type: stats.type || 'simulated',
      total_blocks: stats.total_blocks,
      genesis_block: stats.genesis_block,
      latest_block: stats.latest_block,
      is_valid: stats.is_valid,
      blocks_by_type: stats.blocks_by_type,
      timestamp: new Date().toISOString(),
      ...(stats.type === 'multichain' && {
        chain: stats.chain,
        node_address: stats.node_address,
        streams: stats.streams,
        connections: stats.connections
      })
    };
  }

  async verifyIntegrity() {
    if (isMultiChainEnabled && multichain) {
      try {
        const info = await multichain.getInfo();
        return {
          valid: true,
          message: 'MultiChain blockchain is running',
          total_blocks: info.blocks,
          type: 'multichain'
        };
      } catch (error) {
        return {
          valid: false,
          message: error.message,
          total_blocks: 0,
          type: 'multichain_error'
        };
      }
    }
    
    const isValid = this.blockchain.isChainValid();
    return {
      valid: isValid.valid,
      message: isValid.valid ? 'Simulated blockchain integrity verified' : isValid.error,
      total_blocks: this.blockchain.chain ? this.blockchain.chain.length : 0,
      type: 'simulated'
    };
  }
}

module.exports = new BlockchainService();