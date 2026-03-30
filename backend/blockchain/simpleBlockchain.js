// backend/blockchain/simpleBlockchain.js
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class SimpleBlockchain {
  constructor() {
    this.chainFile = path.join(__dirname, 'blockchain.json');
    this.chain = this.loadChain();
    this.difficulty = 4;
    
    // If chain is empty, create genesis block
    if (!this.chain || this.chain.length === 0) {
      console.log('📦 Creating new blockchain...');
      this.chain = [this.createGenesisBlock()];
      this.saveChain();
      console.log('✅ Genesis block created');
    } else {
      console.log(`📦 Loaded blockchain with ${this.chain.length} blocks`);
    }
  }

  loadChain() {
    try {
      if (fs.existsSync(this.chainFile)) {
        const data = fs.readFileSync(this.chainFile, 'utf8');
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Error loading blockchain:', error.message);
    }
    return [];
  }

  saveChain() {
    try {
      fs.writeFileSync(this.chainFile, JSON.stringify(this.chain, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving blockchain:', error.message);
      return false;
    }
  }

  createGenesisBlock() {
    const genesisBlock = {
      index: 0,
      timestamp: new Date().toISOString(),
      data: { message: 'Genesis Block - HIV Health System' },
      previousHash: '0',
      hash: '',
      nonce: 0
    };
    // Calculate hash for genesis block
    genesisBlock.hash = this.calculateHash(
      genesisBlock.index,
      genesisBlock.timestamp,
      genesisBlock.data,
      genesisBlock.previousHash,
      genesisBlock.nonce
    );
    return genesisBlock;
  }

  calculateHash(index, timestamp, data, previousHash, nonce) {
    const blockString = index + timestamp + JSON.stringify(data) + previousHash + nonce;
    return crypto.createHash('sha256').update(blockString).digest('hex');
  }

  mineBlock(index, timestamp, data, previousHash) {
    let nonce = 0;
    let hash = this.calculateHash(index, timestamp, data, previousHash, nonce);
    const target = '0'.repeat(this.difficulty);
    
    // Mining process - find hash with leading zeros
    let mined = false;
    while (!mined) {
      hash = this.calculateHash(index, timestamp, data, previousHash, nonce);
      if (hash.substring(0, this.difficulty) === target) {
        mined = true;
      } else {
        nonce++;
      }
    }
    
    return { hash, nonce };
  }

  getLatestBlock() {
    if (!this.chain || this.chain.length === 0) {
      return null;
    }
    return this.chain[this.chain.length - 1];
  }

  addBlock(data, userId = null) {
    const previousBlock = this.getLatestBlock();
    const index = previousBlock ? previousBlock.index + 1 : 1;
    const timestamp = new Date().toISOString();
    const previousHash = previousBlock ? previousBlock.hash : '0';
    
    const blockData = {
      ...data,
      blockchain_metadata: {
        recorded_by: userId,
        recorded_at: timestamp,
        block_index: index
      }
    };
    
    const { hash, nonce } = this.mineBlock(index, timestamp, blockData, previousHash);
    
    const newBlock = {
      index,
      timestamp,
      data: blockData,
      previousHash,
      hash,
      nonce
    };
    
    this.chain.push(newBlock);
    this.saveChain();
    
    console.log(`🔗 Block ${index} added to blockchain`);
    return newBlock;
  }

  getBlocksByEntity(entityType, entityId) {
    if (!this.chain) return [];
    return this.chain.filter(block => 
      block.data && block.data.entity_type === entityType && 
      block.data.entity_id === entityId
    );
  }

  isChainValid() {
    if (!this.chain || this.chain.length === 0) {
      return { valid: true, message: 'Empty chain' };
    }
    
    // Check genesis block
    if (this.chain[0].index !== 0) {
      return { valid: false, error: 'Genesis block index is not 0' };
    }
    
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];
      
      // Verify current block's hash
      const calculatedHash = this.calculateHash(
        currentBlock.index,
        currentBlock.timestamp,
        currentBlock.data,
        currentBlock.previousHash,
        currentBlock.nonce
      );
      
      if (currentBlock.hash !== calculatedHash) {
        return { valid: false, error: `Invalid hash at block ${i}` };
      }
      
      // Verify link to previous block
      if (currentBlock.previousHash !== previousBlock.hash) {
        return { valid: false, error: `Invalid chain link at block ${i}` };
      }
    }
    
    return { valid: true };
  }

  verifyData(data, blockIndex = null) {
    if (!this.chain || this.chain.length === 0) {
      return { verified: false, reason: 'Empty blockchain' };
    }
    
    if (blockIndex) {
      const block = this.chain.find(b => b.index === blockIndex);
      if (!block) return { verified: false, reason: 'Block not found' };
      
      const dataHash = this.calculateHash(
        block.index,
        block.timestamp,
        data,
        block.previousHash,
        block.nonce
      );
      
      return {
        verified: block.hash === dataHash,
        block: block
      };
    }
    
    for (const block of this.chain) {
      const dataHash = this.calculateHash(
        block.index,
        block.timestamp,
        data,
        block.previousHash,
        block.nonce
      );
      
      if (block.hash === dataHash) {
        return { verified: true, block };
      }
    }
    
    return { verified: false, reason: 'Data not found in blockchain' };
  }

  getStats() {
    const isValid = this.isChainValid();
    return {
      total_blocks: this.chain ? this.chain.length : 0,
      genesis_block: this.chain && this.chain[0] ? this.chain[0] : null,
      latest_block: this.getLatestBlock(),
      is_valid: isValid,
      blocks_by_type: this.getBlocksByType()
    };
  }

  getBlocksByType() {
    const types = {};
    if (!this.chain) return types;
    
    this.chain.forEach(block => {
      const type = (block.data && block.data.entity_type) || 'system';
      types[type] = (types[type] || 0) + 1;
    });
    return types;
  }

  exportChain() {
    return {
      chain: this.chain,
      exported_at: new Date().toISOString(),
      total_blocks: this.chain ? this.chain.length : 0,
      hash: crypto.createHash('sha256').update(JSON.stringify(this.chain)).digest('hex')
    };
  }
}

// Create and export instance
const blockchain = new SimpleBlockchain();
module.exports = blockchain;