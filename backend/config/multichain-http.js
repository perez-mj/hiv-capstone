const axios = require('axios');

class MultiChainHTTPClient {
  constructor() {
    this.config = this.getConfig();
    this.initialized = false;
  }

  getConfig() {
    // Get configuration from environment variables
    const host = process.env.MULTICHAIN_HOST || 'localhost';
    const port = process.env.MULTICHAIN_PORT || 7204;
    const user = process.env.MULTICHAIN_USER || 'multichainrpc';
    const password = process.env.MULTICHAIN_PASSWORD;
    const chainName = process.env.MULTICHAIN_CHAINNAME || 'omph_hiv_chain';
    
    // Validate required configuration
    if (!password) {
      console.error('❌ MULTICHAIN_PASSWORD is not set in environment variables');
      console.log('💡 Get password from: ~/.multichain/omph_hiv_chain/multichain.conf');
      throw new Error('MULTICHAIN_PASSWORD is required');
    }
    
    console.log(`🔗 Connecting to MultiChain at http://${host}:${port}`);
    
    return {
      url: `http://${host}:${port}`,
      auth: {
        username: user,
        password: password
      },
      chainName: chainName
    };
  }

  async call(method, params = []) {
    try {
      const response = await axios.post(
        this.config.url,
        {
          jsonrpc: '1.0',
          id: Date.now(),
          method: method,
          params: params
        },
        {
          auth: this.config.auth,
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000 // Increased timeout
        }
      );
      
      if (response.data.error) {
        throw new Error(`RPC Error: ${response.data.error.message}`);
      }
      
      return response.data.result;
    } catch (error) {
      if (error.response) {
        console.error(`RPC call failed (${method}): Status ${error.response.status}`);
        if (error.response.status === 401) {
          console.error('  🔑 Authentication failed - check username and password in .env');
          console.error('  💡 Get password from: ~/.multichain/omph_hiv_chain/multichain.conf');
        } else if (error.response.status === 503) {
          console.error('  ⚠️  MultiChain node is busy or not ready');
        }
      } else {
        console.error(`RPC call failed (${method}):`, error.message);
      }
      throw error;
    }
  }

  async initialize() {
    try {
      console.log('🔍 Testing MultiChain connection...');
      const info = await this.call('getinfo');
      
      if (!info || !info.chainname) {
        throw new Error('Invalid response from MultiChain');
      }
      
      console.log(`✅ Connected to MultiChain: ${info.chainname}`);
      console.log(`   📦 Version: ${info.protocolversion}`);
      console.log(`   📊 Blocks: ${info.blocks}`);
      console.log(`   🔗 Connections: ${info.connections}`);
      console.log(`   💰 Balance: ${info.balance || 0}`);
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize MultiChain client:', error.message);
      this.initialized = false;
      throw error;
    }
  }

  async getStreamInfo(streamName) {
    if (!this.initialized) {
      throw new Error('MultiChain client not initialized');
    }
    
    try {
      return await this.call('getstreaminfo', [streamName]);
    } catch (error) {
      if (error.message.includes('stream not found')) {
        return null;
      }
      throw error;
    }
  }

  async listStreams() {
    if (!this.initialized) {
      throw new Error('MultiChain client not initialized');
    }
    
    try {
      return await this.call('liststreams');
    } catch (error) {
      console.error('Error listing streams:', error.message);
      return [];
    }
  }

  async subscribeToStream(streamName) {
    if (!this.initialized) {
      throw new Error('MultiChain client not initialized');
    }
    
    try {
      await this.call('subscribe', [streamName]);
      console.log(`✅ Subscribed to stream: ${streamName}`);
      return true;
    } catch (error) {
      console.error(`Error subscribing to stream ${streamName}:`, error.message);
      return false;
    }
  }

async getStreamItems(streamName, key = null, count = 100, start = 0) {
  if (!this.initialized) {
    throw new Error('MultiChain client not initialized');
  }

  try {
    let items;
    
    if (key) {
      // Always use pattern matching - get all items and filter client-side
      // This is more reliable than trying exact matches
      const allItems = await this.call('liststreamitems', [streamName, true, count * 3, start]);
      
      // Filter items where key starts with the search pattern
      items = allItems.filter(item => {
        const itemKey = item.keys ? item.keys[0] : '';
        return itemKey.startsWith(key);
      });
      
      // Apply pagination manually
      items = items.slice(0, count);
    } else {
      items = await this.call('liststreamitems', [streamName, true, count, start]);
    }
    
    // Ensure items is an array
    if (!items) items = [];
    
    return items.map(item => ({
      txid: item.txid,
      key: item.keys ? item.keys[0] : 'unknown',
      data: this.parseData(item.data),
      time: item.time,
      confirmations: item.confirmations
    }));
  } catch (error) {
    console.error(`Error getting stream items from ${streamName}:`, error.message);
    return [];
  }
}

  // NEW METHOD: Publish to stream
  async publishToStream(streamName, key, data, options = {}) {
    if (!this.initialized) {
      throw new Error('MultiChain client not initialized');
    }
    
    try {
      // Convert data to hex string if it's an object
      let hexData;
      if (typeof data === 'object') {
        hexData = Buffer.from(JSON.stringify(data)).toString('hex');
      } else if (typeof data === 'string') {
        hexData = Buffer.from(data).toString('hex');
      } else {
        hexData = Buffer.from(String(data)).toString('hex');
      }
      
      // Prepare publish parameters
      const params = [streamName, key, hexData];
      
      // Add options if provided (e.g., offline, metadata)
      if (options.offline) {
        params.push('offline');
      }
      
      // Call the publish method
      const result = await this.call('publish', params);
      
      console.log(`✅ Published to stream ${streamName} with key ${key}: ${result}`);
      return {
        txid: result,
        stream: streamName,
        key: key,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Failed to publish to stream ${streamName}:`, error.message);
      throw error;
    }
  }

  // NEW METHOD: Publish multiple items to stream
  async publishMultiple(streamName, items) {
    if (!this.initialized) {
      throw new Error('MultiChain client not initialized');
    }
    
    try {
      const results = [];
      for (const item of items) {
        const result = await this.publishToStream(streamName, item.key, item.data);
        results.push(result);
      }
      return results;
    } catch (error) {
      console.error('Failed to publish multiple items:', error.message);
      throw error;
    }
  }

  // NEW METHOD: Get stream items by key
  async getStreamKeyItems(streamName, key, verbose = true, count = 100, start = 0) {
    if (!this.initialized) {
      throw new Error('MultiChain client not initialized');
    }
    
    try {
      const items = await this.call('liststreamkeyitems', [streamName, key, verbose, count, start]);
      return items.map(item => ({
        txid: item.txid,
        key: item.keys ? item.keys[0] : key,
        data: this.parseData(item.data),
        time: item.time,
        confirmations: item.confirmations
      }));
    } catch (error) {
      console.error(`Error getting stream items for key ${key}:`, error.message);
      return [];
    }
  }

  // NEW METHOD: Ensure stream exists and create if needed
  async ensureStreamExists(streamName, options = {}) {
    if (!this.initialized) {
      throw new Error('MultiChain client not initialized');
    }
    
    try {
      // Check if stream exists
      const streamInfo = await this.getStreamInfo(streamName);
      
      if (!streamInfo) {
        console.log(`Stream ${streamName} not found, creating...`);
        
        // Create the stream
        const createParams = [streamName];
        if (options.open) {
          createParams.push('open');
        }
        
        const txid = await this.call('create', createParams);
        console.log(`✅ Created stream ${streamName}: ${txid}`);
        
        // Subscribe to the stream
        await this.subscribeToStream(streamName);
        
        return { created: true, txid, stream: streamName };
      }
      
      // Ensure we're subscribed
      if (!streamInfo.subscribed) {
        await this.subscribeToStream(streamName);
      }
      
      return { created: false, stream: streamName, exists: true };
    } catch (error) {
      console.error(`Error ensuring stream ${streamName}:`, error.message);
      throw error;
    }
  }

  // NEW METHOD: Get stream item by transaction ID
  async getStreamItem(txid) {
    if (!this.initialized) {
      throw new Error('MultiChain client not initialized');
    }
    
    try {
      const item = await this.call('getstreamitem', [txid]);
      return {
        txid: item.txid,
        key: item.keys ? item.keys[0] : 'unknown',
        data: this.parseData(item.data),
        time: item.time,
        confirmations: item.confirmations
      };
    } catch (error) {
      console.error(`Error getting stream item ${txid}:`, error.message);
      return null;
    }
  }

  // NEW METHOD: Get transaction details
  async getTransaction(txid) {
    if (!this.initialized) {
      throw new Error('MultiChain client not initialized');
    }
    
    try {
      const tx = await this.call('gettransaction', [txid]);
      return tx;
    } catch (error) {
      console.error(`Error getting transaction ${txid}:`, error.message);
      return null;
    }
  }

  // NEW METHOD: Get raw transaction
  async getRawTransaction(txid) {
    if (!this.initialized) {
      throw new Error('MultiChain client not initialized');
    }
    
    try {
      const rawTx = await this.call('getrawtransaction', [txid]);
      return rawTx;
    } catch (error) {
      console.error(`Error getting raw transaction ${txid}:`, error.message);
      return null;
    }
  }

  // NEW METHOD: Get address information
  async getAddressInfo(address) {
    if (!this.initialized) {
      throw new Error('MultiChain client not initialized');
    }
    
    try {
      const info = await this.call('getaddressinfo', [address]);
      return info;
    } catch (error) {
      console.error(`Error getting address info for ${address}:`, error.message);
      return null;
    }
  }

  parseData(data) {
    try {
      if (typeof data === 'string' && data.match(/^[0-9a-fA-F]+$/)) {
        const decoded = Buffer.from(data, 'hex').toString();
        try {
          return JSON.parse(decoded);
        } catch (e) {
          return decoded;
        }
      }
      return data;
    } catch (error) {
      return { raw: data };
    }
  }

  // NEW METHOD: Check if client is initialized
  isInitialized() {
    return this.initialized;
  }

  // NEW METHOD: Get chain info
  async getChainInfo() {
    if (!this.initialized) {
      throw new Error('MultiChain client not initialized');
    }
    
    try {
      const info = await this.call('getinfo');
      const blockchainInfo = await this.call('getblockchaininfo');
      const miningInfo = await this.call('getmininginfo');
      
      return {
        ...info,
        ...blockchainInfo,
        mining: miningInfo
      };
    } catch (error) {
      console.error('Error getting chain info:', error.message);
      throw error;
    }
  }

  // NEW METHOD: Get block hash by height
  async getBlockHash(height) {
    if (!this.initialized) {
      throw new Error('MultiChain client not initialized');
    }
    
    try {
      return await this.call('getblockhash', [height]);
    } catch (error) {
      console.error(`Error getting block hash for height ${height}:`, error.message);
      return null;
    }
  }

  // NEW METHOD: Get block by hash
  async getBlock(blockHash) {
    if (!this.initialized) {
      throw new Error('MultiChain client not initialized');
    }
    
    try {
      return await this.call('getblock', [blockHash]);
    } catch (error) {
      console.error(`Error getting block ${blockHash}:`, error.message);
      return null;
    }
  }

  // NEW METHOD: Get block by height
  async getBlockByHeight(height) {
    const blockHash = await this.getBlockHash(height);
    if (!blockHash) return null;
    return await this.getBlock(blockHash);
  }

  // NEW METHOD: Get address balances
  async getAddressBalances(address) {
    if (!this.initialized) {
      throw new Error('MultiChain client not initialized');
    }
    
    try {
      const balances = await this.call('getaddressbalances', [address]);
      return balances;
    } catch (error) {
      console.error(`Error getting balances for ${address}:`, error.message);
      return [];
    }
  }
}

module.exports = MultiChainHTTPClient;