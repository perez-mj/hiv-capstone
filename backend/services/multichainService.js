const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const MultiChainHTTPClient = require('../config/multichain-http');

class MultiChainService {
  constructor() {
    this.client = null;
    this.initialized = false;
    this.initPromise = null;
    this.cache = new Map();
    this.cacheTimeout = 60000; // 1 minute cache
  }

  async getClient() {
    if (this.client && this.initialized) {
      return this.client;
    }
    
    if (!this.initPromise) {
      this.initPromise = this.initializeClient();
    }
    
    return this.initPromise;
  }

  async initializeClient() {
    try {
      this.client = new MultiChainHTTPClient();
      await this.client.initialize();
      this.initialized = true;
      console.log('✅ MultiChain service initialized successfully');
      return this.client;
    } catch (error) {
      console.error('❌ Failed to initialize MultiChain service:', error.message);
      this.initialized = false;
      this.client = null;
      this.initPromise = null;
      throw error;
    }
  }

  async isAvailable() {
    try {
      const client = await this.getClient();
      if (!client || !this.initialized) {
        return false;
      }
      
      const info = await client.call('getinfo');
      return info && info.chainname !== undefined;
    } catch (error) {
      console.error('MultiChain availability check failed:', error.message);
      return false;
    }
  }

  async getInfo() {
  const cacheKey = 'blockchain_info';
  const cached = this.getCached(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const client = await this.getClient();

    if (!client || !this.initialized) {
      throw new Error('MultiChain not initialized');
    }

    const info = await client.call('getinfo');
    const miningInfo = await client.call('getmininginfo');
    const streams = await client.listStreams();

    /*
     * REAL chain size calculation
     */
    let chainSize = 0;

    try {
      const chainDir = this.getChainDirectory(
        info.chainname || 'omph_hiv_chain'
      );

      const blocksDir = path.join(chainDir, 'blocks');
      const chainstateDir = path.join(chainDir, 'chainstate');

      const [blocksSize, chainstateSize] = await Promise.all([
        this.getDirectorySize(blocksDir),
        this.getDirectorySize(chainstateDir)
      ]);

      chainSize = blocksSize + chainstateSize;
    } catch (err) {
      console.error('Failed to calculate chain size:', err.message);
    }

    const result = {
      total_blocks: info.blocks || 0,
      chain_name: info.chainname || 'omph_hiv_chain',
      version: info.version,
      protocol_version: info.protocolversion,

      node_address: `${info.nodeaddress || 'localhost'}:${info.port || 7204}`,

      connections: info.connections || 0,

      difficulty: miningInfo.difficulty || 0,

      mining: miningInfo.mining || false,

      chain_size: chainSize,

      streams: streams.length,

      is_valid: await this.verifyIntegrity(),

      latest_block: await this.getLatestBlock(),

      wallet_version: info.walletversion,

      wallet_balance: info.balance || 0
    };

    this.setCached(cacheKey, result, 300000);

    return result;

  } catch (error) {
    console.error('Error getting blockchain info:', error);
    throw error;
  }
}

  async getBlocks(limit = 10, offset = 0) {
    const cacheKey = `blocks_${limit}_${offset}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;
    
    try {
      const client = await this.getClient();
      
      if (!client || !this.initialized) {
        throw new Error('MultiChain not initialized');
      }
      
      const info = await client.call('getinfo');
      const totalBlocks = info.blocks || 0;
      const blocks = [];
      
      const startBlock = totalBlocks - offset;
      const endBlock = Math.max(0, startBlock - limit);
      
      for (let i = startBlock; i > endBlock && i >= 0; i--) {
        try {
          const blockHash = await client.call('getblockhash', [i]);
          const block = await client.call('getblock', [blockHash]);
          
          blocks.push({
            height: i,
            hash: block.hash,
            timestamp: new Date(block.time * 1000).toISOString(),
            size: block.size,
            transaction_count: block.tx ? block.tx.length : 0,
            verified: true,
            miner: block.miner || 'Unknown',
            confirmations: block.confirmations || 1
          });
        } catch (err) {
          console.error(`Error fetching block ${i}:`, err.message);
          blocks.push({
            height: i,
            hash: 'unknown',
            timestamp: new Date().toISOString(),
            size: 0,
            transaction_count: 0,
            verified: false,
            error: err.message
          });
        }
      }
      
      this.setCached(cacheKey, blocks);
      return blocks;
    } catch (error) {
      console.error('Error getting blocks:', error);
      throw error;
    }
  }

  async getStreams() {
    const cacheKey = 'streams_list';
    const cached = this.getCached(cacheKey);
    if (cached) return cached;
    
    try {
      const client = await this.getClient();
      
      if (!client || !this.initialized) {
        throw new Error('MultiChain not initialized');
      }
      
      // Get all streams using liststreams (which includes item counts)
      const streams = await client.call('liststreams');
      const streamDetails = [];
      
      for (const stream of streams) {
        try {
          // Get detailed stream info including subscription status
          const streamInfo = await client.call('getstreaminfo', [stream.name]);
          
          // The items count is directly available from liststreams
          const itemsCount = stream.items || streamInfo?.items || 0;
          const streamSize = await this.calculateStreamSize(stream.name);
          const subscribed = streamInfo?.subscribed || stream.subscribed || false;
          
          streamDetails.push({
            name: stream.name,
            items: itemsCount,
            size: streamSize,
            subscribed: subscribed,
            description: this.getStreamDescription(stream.name),
            created: stream.createtxid ? new Date().toISOString() : null,
            open: stream.open || false,
            details: stream.details || 'stream'
          });
          
          console.log(`📊 Stream ${stream.name}: ${itemsCount} items, subscribed: ${subscribed}`);
          
        } catch (err) {
          console.error(`Error getting details for stream ${stream.name}:`, err.message);
          // Still add the stream with basic info from liststreams
          streamDetails.push({
            name: stream.name,
            items: stream.items || 0,
            size: 0,
            subscribed: stream.subscribed || false,
            description: this.getStreamDescription(stream.name)
          });
        }
      }
      
      // Sort streams by name for consistency
      streamDetails.sort((a, b) => a.name.localeCompare(b.name));
      
      this.setCached(cacheKey, streamDetails);
      return streamDetails;
    } catch (error) {
      console.error('Error getting streams:', error);
      throw error;
    }
  }

  getStreamDescription(streamName) {
    const descriptions = {
      'root': 'Root system stream',
      'patients': 'Patient medical records and demographic data',
      'patient_records': 'Patient medical records and demographic data',
      'appointments': 'Appointment scheduling and history',
      'lab_results': 'Laboratory test results and reports',
      'audit_logs': 'System audit trail and security events',
      'prescriptions': 'Medication prescriptions and refills',
      'encounters': 'Clinical encounter records'
    };
    return descriptions[streamName] || `Stream for ${streamName} data`;
  }

  async verifyIntegrity() {
    const cacheKey = 'integrity_check';
    const cached = this.getCached(cacheKey);
    if (cached) return cached;
    
    try {
      const client = await this.getClient();
      
      if (!client || !this.initialized) {
        throw new Error('MultiChain not initialized');
      }
      
      const info = await client.call('getinfo');
      const totalBlocks = info.blocks || 0;
      
      let verifiedCount = 0;
      let failedChecks = 0;
      
      // Verify last 100 blocks
      const startBlock = Math.max(0, totalBlocks - 100);
      for (let i = startBlock; i <= totalBlocks && i > 0; i++) {
        try {
          const blockHash = await client.call('getblockhash', [i]);
          const block = await client.call('getblock', [blockHash]);
          
          if (block && block.hash === blockHash) {
            verifiedCount++;
          } else {
            failedChecks++;
          }
        } catch (err) {
          failedChecks++;
        }
      }
      
      const isValid = failedChecks === 0;
      const result = {
        valid: isValid,
        message: isValid 
          ? `Successfully verified ${verifiedCount} blocks` 
          : `${failedChecks} blocks failed verification`,
        total_verified: verifiedCount,
        failed_checks: failedChecks,
        last_verification: new Date().toISOString(),
        last_verified_block: totalBlocks,
        total_blocks_checked: verifiedCount + failedChecks
      };
      
      this.setCached(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error verifying integrity:', error);
      throw error;
    }
  }

  async getBlockGrowth(period = 'month') {
    const cacheKey = `block_growth_${period}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;
    
    try {
      const client = await this.getClient();
      
      if (!client || !this.initialized) {
        throw new Error('MultiChain not initialized');
      }
      
      const info = await client.call('getinfo');
      const totalBlocks = info.blocks || 0;
      
      // Calculate date range based on period
      let days;
      switch(period) {
        case 'week':
          days = 7;
          break;
        case 'month':
          days = 30;
          break;
        case 'quarter':
          days = 90;
          break;
        default:
          days = 30;
      }
      
      const blocksPerDay = new Array(days + 1).fill(0);
      const timestamps = [];
      const now = Math.floor(Date.now() / 1000);
      const secondsPerDay = 86400;
      
      // Generate timestamps for each day
      for (let i = days; i >= 0; i--) {
        const targetTime = now - (i * secondsPerDay);
        const date = new Date(targetTime * 1000);
        timestamps.push(date.toLocaleDateString());
      }
      
      // Get block timestamps
      const startBlock = Math.max(0, totalBlocks - 500);
      
      for (let blockHeight = startBlock; blockHeight <= totalBlocks; blockHeight++) {
        try {
          const blockHash = await client.call('getblockhash', [blockHeight]);
          const block = await client.call('getblock', [blockHash]);
          
          if (block && block.time) {
            const dayIndex = Math.floor((now - block.time) / secondsPerDay);
            if (dayIndex >= 0 && dayIndex <= days) {
              blocksPerDay[days - dayIndex]++;
            }
          }
        } catch (err) {
          console.error(`Error fetching block ${blockHeight}:`, err.message);
        }
      }
      
      const result = {
        blocks: blocksPerDay,
        timestamps: timestamps,
        total_blocks: totalBlocks,
        period: period,
        average_daily_blocks: Math.round(blocksPerDay.reduce((a, b) => a + b, 0) / blocksPerDay.length)
      };
      
      this.setCached(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error getting block growth:', error);
      throw error;
    }
  }

  getSimulatedGrowthData(period = 'month') {
    let days;
    switch(period) {
      case 'week': days = 7; break;
      case 'month': days = 30; break;
      case 'quarter': days = 90; break;
      default: days = 30;
    }
    
    const blocks = [];
    const timestamps = [];
    const now = new Date();
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      timestamps.push(date.toLocaleDateString());
      // Simulate block growth with some randomness
      blocks.push(Math.floor(Math.random() * 50) + 10);
    }
    
    return {
      blocks: blocks,
      timestamps: timestamps,
      total_blocks: blocks.reduce((a, b) => a + b, 0),
      period: period,
      average_daily_blocks: Math.round(blocks.reduce((a, b) => a + b, 0) / blocks.length),
      simulated: true
    };
  }

  async getLatestBlock() {
    const cacheKey = 'latest_block';
    const cached = this.getCached(cacheKey);
    if (cached) return cached;
    
    try {
      const client = await this.getClient();
      
      if (!client || !this.initialized) {
        throw new Error('MultiChain not initialized');
      }
      
      const info = await client.call('getinfo');
      const height = info.blocks || 0;
      const blockHash = await client.call('getblockhash', [height]);
      const block = await client.call('getblock', [blockHash]);
      
      const result = {
        index: height,
        hash: block.hash,
        timestamp: new Date(block.time * 1000).toISOString(),
        size: block.size,
        transaction_count: block.tx ? block.tx.length : 0,
        confirmations: block.confirmations || 1
      };
      
      this.setCached(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error getting latest block:', error);
      throw error;
    }
  }

  async runDiagnostics() {
    const diagnostics = [];
    
    try {
      const client = await this.getClient();
      
      // Test 1: Network Connectivity
      try {
        const info = await client.call('getinfo');
        diagnostics.push({
          test: 'Network Connectivity',
          passed: true,
          message: `Connected to MultiChain node (${info.connections || 0} connections)`,
          details: {
            version: info.version,
            protocol: info.protocolversion,
            connections: info.connections,
            blocks: info.blocks
          }
        });
      } catch (error) {
        diagnostics.push({
          test: 'Network Connectivity',
          passed: false,
          message: `Failed to connect: ${error.message}`,
          details: { error: error.message }
        });
      }
      
      // Test 2: Blockchain Height
      try {
        const info = await client.call('getinfo');
        const height = info.blocks || 0;
        diagnostics.push({
          test: 'Blockchain Height',
          passed: height > 0,
          message: `Current blockchain height: ${height} blocks`,
          details: { height }
        });
      } catch (error) {
        diagnostics.push({
          test: 'Blockchain Height',
          passed: false,
          message: `Unable to determine blockchain height: ${error.message}`
        });
      }
      
      // Test 3: Stream Access
      try {
        const streams = await this.getStreams();
        diagnostics.push({
          test: 'Stream Access',
          passed: streams.length > 0,
          message: `Successfully accessed ${streams.length} streams`,
          details: { 
            stream_count: streams.length,
            streams: streams.map(s => ({ name: s.name, items: s.items, subscribed: s.subscribed }))
          }
        });
      } catch (error) {
        diagnostics.push({
          test: 'Stream Access',
          passed: false,
          message: `Failed to access streams: ${error.message}`
        });
      }
      
      // Test 4: Integrity Check
      try {
        const integrity = await this.verifyIntegrity();
        diagnostics.push({
          test: 'Blockchain Integrity',
          passed: integrity.valid,
          message: integrity.message,
          details: {
            verified_blocks: integrity.total_verified,
            failed_checks: integrity.failed_checks
          }
        });
      } catch (error) {
        diagnostics.push({
          test: 'Blockchain Integrity',
          passed: false,
          message: `Integrity check failed: ${error.message}`
        });
      }
      
      // Test 5: Publish Capability
      try {
        const testStream = 'test_stream';
        await client.ensureStreamExists(testStream, { open: true });
        const result = await client.publishToStream(testStream, 'test_key', { test: 'data' });
        diagnostics.push({
          test: 'Publish Capability',
          passed: !!result && !!result.txid,
          message: result ? `Successfully published test transaction: ${result.txid}` : 'Failed to publish test transaction',
          details: { txid: result?.txid }
        });
      } catch (error) {
        diagnostics.push({
          test: 'Publish Capability',
          passed: false,
          message: `Failed to publish test transaction: ${error.message}`
        });
      }
      
    } catch (error) {
      diagnostics.push({
        test: 'Diagnostics Error',
        passed: false,
        message: `Unexpected error during diagnostics: ${error.message}`
      });
    }
    
    return diagnostics;
  }

  // NEW METHOD: Publish to stream (wrapper for client method)
  async publishToStream(streamName, key, data, options = {}) {
    try {
      const client = await this.getClient();
      
      if (!client || !this.initialized) {
        throw new Error('MultiChain not initialized');
      }
      
      // Ensure stream exists
      await client.ensureStreamExists(streamName, { open: true });
      
      // Publish to stream
      const result = await client.publishToStream(streamName, key, data, options);
      
      // Clear cache for affected streams
      this.clearCacheForStream(streamName);
      
      return result;
    } catch (error) {
      console.error(`Error publishing to stream ${streamName}:`, error.message);
      throw error;
    }
  }

  // NEW METHOD: Get stream items
  async getStreamItems(streamName, key = null, count = 100, start = 0) {
    const cacheKey = `stream_items_${streamName}_${key}_${count}_${start}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;
    
    try {
      const client = await this.getClient();
      
      if (!client || !this.initialized) {
        throw new Error('MultiChain not initialized');
      }
      
      const items = await client.getStreamItems(streamName, key, count, start);
      this.setCached(cacheKey, items, 30000); // Cache for 30 seconds
      return items;
    } catch (error) {
      console.error(`Error getting stream items from ${streamName}:`, error.message);
      return [];
    }
  }

  // NEW METHOD: Get stream item by key
  async getStreamKeyItems(streamName, key, count = 100, start = 0) {
    return this.getStreamItems(streamName, key, count, start);
  }

  async getDirectorySize(dirPath) {
  let totalSize = 0;

  async function walk(currentPath) {
    const entries = await fs.readdir(currentPath, {
      withFileTypes: true
    });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      try {
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
        }
      } catch (err) {
        console.error(`Error reading ${fullPath}:`, err.message);
      }
    }
  }

  try {
    await walk(dirPath);
    return totalSize;
  } catch (err) {
    console.error('Error calculating directory size:', err.message);
    return 0;
  }
}

async calculateStreamSize(streamName) {
  try {
    const client = await this.getClient();

    const items = await client.call(
      'liststreamitems',
      [streamName, false, 1000]
    );

    let totalBytes = 0;

    for (const item of items) {
      try {
        // Count raw data size
        if (item.data) {
          totalBytes += Buffer.byteLength(
            JSON.stringify(item.data),
            'utf8'
          );
        }

        // Count keys
        if (item.keys) {
          totalBytes += Buffer.byteLength(
            JSON.stringify(item.keys),
            'utf8'
          );
        }

        // Count txid metadata
        if (item.txid) {
          totalBytes += Buffer.byteLength(item.txid, 'utf8');
        }

      } catch (err) {
        console.error(
          `Error sizing item in ${streamName}:`,
          err.message
        );
      }
    }

    return totalBytes;

  } catch (err) {
    console.error(
      `Error calculating stream size for ${streamName}:`,
      err.message
    );

    return 0;
  }
}
  // NEW METHOD: Ensure stream exists
  async ensureStreamExists(streamName, options = {}) {
    try {
      const client = await this.getClient();
      
      if (!client || !this.initialized) {
        throw new Error('MultiChain not initialized');
      }
      
      return await client.ensureStreamExists(streamName, options);
    } catch (error) {
      console.error(`Error ensuring stream ${streamName}:`, error.message);
      throw error;
    }
  }

  getChainDirectory(chainName = 'omph_hiv_chain') {
  const home = os.homedir();

  switch (process.platform) {
    case 'win32':
      return path.join(home, 'AppData', 'Roaming', 'MultiChain', chainName);

    case 'darwin':
      return path.join(home, 'Library', 'Application Support', 'MultiChain', chainName);

    default:
      return path.join(home, '.multichain', chainName);
  }
}

  // Cache management methods
  getCached(key) {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCached(key, data, timeout = this.cacheTimeout) {
    this.cache.set(key, {
      data: data,
      expiry: Date.now() + timeout
    });
  }

  clearCacheForStream(streamName) {
    // Clear all cache entries that might be affected by stream changes
    for (const key of this.cache.keys()) {
      if (key.includes(streamName) || key.includes('streams_list')) {
        this.cache.delete(key);
      }
    }
  }

  clearCache() {
    this.cache.clear();
    console.log('Cache cleared successfully');
  }
}

module.exports = new MultiChainService();