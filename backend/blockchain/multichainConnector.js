// backend/blockchain/multichainConnector.js
const axios = require('axios');
const crypto = require('crypto');

class MultiChainConnector {
  constructor() {
    this.host = process.env.MULTICHAIN_HOST || 'localhost';
    this.port = process.env.MULTICHAIN_PORT || 7746;
    this.user = process.env.MULTICHAIN_USER || 'multichainrpc';
    this.password = process.env.MULTICHAIN_PASSWORD || 'password';
    this.chain = process.env.MULTICHAIN_CHAIN || 'hiv-health-chain';
    this.rpcUrl = `http://${this.host}:${this.port}`;
    this.auth = {
      username: this.user,
      password: this.password
    };
  }

  async rpcCall(method, params = []) {
    try {
      const response = await axios.post(
        this.rpcUrl,
        {
          jsonrpc: '1.0',
          id: crypto.randomBytes(16).toString('hex'),
          method: method,
          params: params
        },
        {
          auth: this.auth,
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        }
      );

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      return response.data.result;
    } catch (error) {
      console.error(`MultiChain RPC Error (${method}):`, error.message);
      throw error;
    }
  }

  async getInfo() {
    return await this.rpcCall('getinfo');
  }

  async createStream(streamName) {
    try {
      return await this.rpcCall('create', ['stream', streamName, true]);
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(`Stream ${streamName} already exists`);
        return { already_exists: true };
      }
      throw error;
    }
  }

  async publishToStream(streamName, key, data, metadata = {}) {
    const dataHex = Buffer.from(JSON.stringify(data)).toString('hex');
    const metadataHex = Buffer.from(JSON.stringify(metadata)).toString('hex');
    return await this.rpcCall('publish', [streamName, key, dataHex, metadataHex]);
  }

  async listStreamItems(streamName) {
    return await this.rpcCall('liststreamitems', [streamName]);
  }
}

module.exports = new MultiChainConnector();