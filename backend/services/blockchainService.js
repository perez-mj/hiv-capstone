const crypto = require('crypto');
const db = require('../models');

class BlockchainService {
  constructor() {
    // In production, this would connect to MultiChain
    // For now, we'll simulate blockchain storage
    this.blockchain = new Map();
  }
  
  generateHash(record, previousHash = '0') {
    const recordString = JSON.stringify({
      id: record.id,
      data: record,
      timestamp: new Date().toISOString()
    });
    
    return crypto
      .createHash('sha256')
      .update(previousHash + recordString)
      .digest('hex');
  }
  
  async storeRecord(record, recordType) {
    try {
      // Get previous hash from last record
      const lastRecord = await this.getLastRecord(recordType);
      const previousHash = lastRecord ? lastRecord.blockchain_hash : '0';
      
      // Generate hash
      const hash = this.generateHash(record, previousHash);
      
      // Store hash in database
      await record.update({ blockchain_hash: hash });
      
      // Simulate storing in blockchain
      const block = {
        index: this.blockchain.size + 1,
        timestamp: new Date().toISOString(),
        data: {
          recordType,
          recordId: record.id,
          hash,
          previousHash
        }
      };
      
      this.blockchain.set(block.index, block);
      
      return { success: true, hash, blockIndex: block.index };
    } catch (error) {
      console.error('Blockchain store error:', error);
      return { success: false, error: error.message };
    }
  }
  
  async getLastRecord(recordType) {
    const model = recordType === 'TestingEncounter' 
      ? db.TestingEncounter 
      : db.TreatmentEncounter;
    
    const lastRecord = await model.findOne({
      order: [['created_at', 'DESC']],
      where: { blockchain_hash: { [db.Sequelize.Op.ne]: null } }
    });
    
    return lastRecord;
  }
  
  async verifyRecord(record, recordType) {
    try {
      // Get previous record
      const previousRecord = await this.getPreviousRecord(record, recordType);
      const previousHash = previousRecord ? previousRecord.blockchain_hash : '0';
      
      // Recompute hash
      const recomputedHash = this.generateHash(record, previousHash);
      
      // Compare with stored hash
      const isValid = recomputedHash === record.blockchain_hash;
      
      // Verify on blockchain
      const blockchainValid = await this.verifyOnBlockchain(record);
      
      return {
        isValid: isValid && blockchainValid,
        recomputedHash,
        storedHash: record.blockchain_hash,
        previousHash
      };
    } catch (error) {
      console.error('Verification error:', error);
      return { isValid: false, error: error.message };
    }
  }
  
  async getPreviousRecord(record, recordType) {
    const model = recordType === 'TestingEncounter' 
      ? db.TestingEncounter 
      : db.TreatmentEncounter;
    
    const previousRecord = await model.findOne({
      where: {
        id: { [db.Sequelize.Op.lt]: record.id },
        blockchain_hash: { [db.Sequelize.Op.ne]: null }
      },
      order: [['id', 'DESC']]
    });
    
    return previousRecord;
  }
  
  async verifyOnBlockchain(record) {
    // In production, this would query MultiChain
    // For now, simulate verification
    const block = Array.from(this.blockchain.values()).find(
      b => b.data.recordId === record.id
    );
    
    if (!block) return false;
    
    const isValid = block.data.hash === record.blockchain_hash;
    return isValid;
  }
  
  async scanForTampering(recordType) {
    const model = recordType === 'TestingEncounter' 
      ? db.TestingEncounter 
      : db.TreatmentEncounter;
    
    const records = await model.findAll({
      where: { blockchain_hash: { [db.Sequelize.Op.ne]: null } },
      order: [['id', 'ASC']]
    });
    
    const tamperedRecords = [];
    let previousHash = '0';
    
    for (const record of records) {
      const recomputedHash = this.generateHash(record, previousHash);
      
      if (recomputedHash !== record.blockchain_hash) {
        tamperedRecords.push({
          id: record.id,
          expectedHash: recomputedHash,
          actualHash: record.blockchain_hash,
          recordType
        });
      }
      
      previousHash = record.blockchain_hash;
    }
    
    return tamperedRecords;
  }
  
  async getBlockchainStats() {
    return {
      totalBlocks: this.blockchain.size,
      chainValid: await this.validateChain(),
      lastBlock: this.blockchain.get(this.blockchain.size)
    };
  }
  
  async validateChain() {
    let previousHash = '0';
    
    for (let i = 1; i <= this.blockchain.size; i++) {
      const block = this.blockchain.get(i);
      if (!block) return false;
      
      // Verify hash chain
      const expectedHash = crypto
        .createHash('sha256')
        .update(previousHash + JSON.stringify(block.data))
        .digest('hex');
      
      if (block.data.hash !== expectedHash) {
        return false;
      }
      
      previousHash = block.data.hash;
    }
    
    return true;
  }
}

module.exports = new BlockchainService();