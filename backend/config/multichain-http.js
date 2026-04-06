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
      throw new Error('MULTICHAIN_PASSWORD is required');
    }
    
    console.log(`Connecting to MultiChain at ${host}:${port}`);
    
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
          timeout: 10000
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
          console.error('  Authentication failed - check username and password');
        }
      } else {
        console.error(`RPC call failed (${method}):`, error.message);
      }
      throw error;
    }
  }

  async initialize() {
    try {
      console.log('Testing MultiChain connection...');
      const info = await this.call('getinfo');
      
      if (!info || !info.chainname) {
        throw new Error('Invalid response from MultiChain');
      }
      
      console.log('✅ Connected to MultiChain:', info.chainname);
      console.log('   Version:', info.protocolversion);
      console.log('   Blocks:', info.blocks);
      console.log('   Connections:', info.connections);
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize MultiChain client:', error.message);
      this.initialized = false;
      throw error;
    }
  }

  async createStream(streamName, restricted = false) {
    if (!this.initialized) {
      throw new Error('MultiChain client not initialized');
    }
    
    try {
      const result = await this.call('create', ['stream', streamName, restricted]);
      console.log(`✅ Created stream: ${streamName}`);
      return result;
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(`ℹ️  Stream ${streamName} already exists`);
        return null;
      }
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
      return null;
    }
  }

  async publishToStream(streamName, key, data) {
    if (!this.initialized) {
      throw new Error('MultiChain client not initialized');
    }

    try {
      const hexData = Buffer.from(JSON.stringify(data)).toString('hex');
      const result = await this.call('publish', [streamName, key, hexData]);
      
      return {
        txid: result,
        timestamp: new Date().toISOString(),
        stream: streamName,
        key: key
      };
    } catch (error) {
      console.error('Error publishing to stream:', error.message);
      throw error;
    }
  }

  async getStreamItems(streamName, key = null, count = 100, start = 0) {
    if (!this.initialized) {
      throw new Error('MultiChain client not initialized');
    }

    try {
      const params = [streamName, true, count, start];
      if (key) {
        params.push(key);
      }
      
      const items = await this.call('liststreamkeyitems', params);
      
      return items.map(item => ({
        txid: item.txid,
        key: item.key,
        data: JSON.parse(Buffer.from(item.data, 'hex').toString()),
        time: item.time,
        confirmations: item.confirmations
      }));
    } catch (error) {
      console.error('Error getting stream items:', error.message);
      return [];
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

  async verifyTransaction(txid) {
    if (!this.initialized) {
      throw new Error('MultiChain client not initialized');
    }

    try {
      const transaction = await this.call('gettransaction', [txid]);
      return {
        verified: true,
        confirmations: transaction.confirmations,
        blockhash: transaction.blockhash,
        blocktime: transaction.blocktime
      };
    } catch (error) {
      return {
        verified: false,
        error: error.message
      };
    }
  }
}

module.exports = MultiChainHTTPClient;