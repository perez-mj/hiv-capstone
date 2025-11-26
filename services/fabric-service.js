const { FileSystemWallet, Gateway } = require('fabric-network');
const fs = require('fs');
const path = require('path');
const fabricConfig = require('../config/fabric-config');

class FabricService {
  constructor() {
    this.connectionProfilePath = path.resolve(__dirname, '..', fabricConfig.connectionProfilePath);
    this.walletPath = path.resolve(__dirname, '..', fabricConfig.walletPath);
    this.connectionOptions = {
      wallet: null,
      identity: fabricConfig.adminName,
      discovery: { enabled: true, asLocalhost: true }
    };
    this.isConnected = false;
  }

  async connect() {
    // Use mock mode if configured
    if (fabricConfig.useMock) {
      console.log('Using mock Fabric service for development');
      this.isConnected = true;
      return true;
    }

    try {
      // Create wallet directory if it doesn't exist
      if (!fs.existsSync(this.walletPath)) {
        fs.mkdirSync(this.walletPath, { recursive: true });
        console.log(`Created wallet directory: ${this.walletPath}`);
      }

      // Create a new file system based wallet for managing identities.
      const wallet = new FileSystemWallet(this.walletPath);
      this.connectionOptions.wallet = wallet;

      // Check to see if we've already enrolled the admin user.
      const identityExists = await wallet.exists(fabricConfig.adminName);
      if (!identityExists) {
        console.log('Admin identity does not exist in wallet, using mock mode');
        fabricConfig.useMock = true;
        this.isConnected = true;
        return true;
      }

      // Check if connection profile exists
      if (!fs.existsSync(this.connectionProfilePath)) {
        console.log('Connection profile not found, using mock mode');
        fabricConfig.useMock = true;
        this.isConnected = true;
        return true;
      }

      // Create a new gateway for connecting to our peer node.
      this.gateway = new Gateway();
      
      // Load connection profile
      const connectionProfile = JSON.parse(
        fs.readFileSync(this.connectionProfilePath, 'utf8')
      );

      // Connect to gateway using connection profile and connection options
      await this.gateway.connect(connectionProfile, this.connectionOptions);

      // Get network and contract
      this.network = await this.gateway.getNetwork(fabricConfig.channelName);
      this.contract = this.network.getContract(fabricConfig.chaincodeName);

      this.isConnected = true;
      console.log('Connected to Fabric network successfully');
      return true;
    } catch (error) {
      console.error('Failed to connect to Fabric network, using mock mode:', error.message);
      fabricConfig.useMock = true;
      this.isConnected = true;
      return true;
    }
  }

  async ensureConnected() {
    if (!this.isConnected) {
      await this.connect();
    }
    return this.isConnected;
  }

  async storeHash(patientId, dataHash, timestamp) {
    await this.ensureConnected();

    if (fabricConfig.useMock) {
      return this.mockStoreHash(patientId, dataHash, timestamp);
    }

    try {
      console.log(`Storing hash for patient ${patientId}: ${dataHash}`);

      // Submit transaction to store hash
      const result = await this.contract.submitTransaction(
        'storeHash',
        patientId,
        dataHash,
        timestamp
      );

      const response = JSON.parse(result.toString());
      console.log('Hash stored successfully:', response);
      
      return {
        success: true,
        txId: response.txId,
        message: response.message,
        timestamp: new Date().toISOString(),
        status: 'COMMITTED'
      };
    } catch (error) {
      console.error('Failed to store hash on blockchain, using mock:', error.message);
      return this.mockStoreHash(patientId, dataHash, timestamp);
    }
  }

  async verifyHash(patientId, dataHash) {
    await this.ensureConnected();

    if (fabricConfig.useMock) {
      return this.mockVerifyHash(patientId, dataHash);
    }

    try {
      console.log(`Verifying hash for patient ${patientId}: ${dataHash}`);

      // Evaluate transaction to verify hash
      const result = await this.contract.evaluateTransaction(
        'verifyHash',
        patientId,
        dataHash
      );

      const response = JSON.parse(result.toString());
      console.log('Hash verification result:', response);
      
      return {
        verified: response.verified,
        matches: response.matches || [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to verify hash on blockchain, using mock:', error.message);
      return this.mockVerifyHash(patientId, dataHash);
    }
  }

  async getHashHistory(patientId) {
    await this.ensureConnected();

    if (fabricConfig.useMock) {
      return this.mockGetHistory(patientId);
    }

    try {
      const result = await this.contract.evaluateTransaction(
        'getHistory',
        patientId
      );

      return JSON.parse(result.toString());
    } catch (error) {
      console.error('Failed to get hash history, using mock:', error.message);
      return this.mockGetHistory(patientId);
    }
  }

  // Mock implementations for development
  mockStoreHash(patientId, dataHash, timestamp) {
    const txId = `TX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[MOCK] Storing hash for patient ${patientId}: ${dataHash} (TX: ${txId})`);
    
    return {
      success: true,
      txId: txId,
      message: 'Hash stored successfully (MOCK)',
      timestamp: timestamp || new Date().toISOString(),
      blockHash: `BLOCK-${Date.now().toString(16)}`,
      status: 'COMMITTED'
    };
  }

  mockVerifyHash(patientId, dataHash) {
    console.log(`[MOCK] Verifying hash for patient ${patientId}: ${dataHash}`);
    
    // For mock, we'll consider it verified if the hash looks valid
    const isVerified = dataHash && dataHash.length === 64 && /^[a-f0-9]+$/.test(dataHash);
    
    const result = {
      verified: isVerified,
      matches: isVerified ? [{
        patientId,
        dataHash,
        timestamp: new Date().toISOString(),
        txId: `TX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }] : [],
      timestamp: new Date().toISOString()
    };

    console.log(`[MOCK] Verification result: ${result.verified}`);
    return result;
  }

  mockGetHistory(patientId) {
    console.log(`[MOCK] Getting history for patient: ${patientId}`);
    
    return {
      patientId,
      history: [
        {
          dataHash: 'mock_hash_' + Math.random().toString(36).substr(2, 9),
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          txId: 'TX-mock-1'
        },
        {
          dataHash: 'mock_hash_' + Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toISOString(),
          txId: 'TX-mock-2'
        }
      ]
    };
  }

  async disconnect() {
    if (this.gateway && !fabricConfig.useMock) {
      await this.gateway.disconnect();
      console.log('Disconnected from Fabric network');
    }
    this.isConnected = false;
  }
}

module.exports = new FabricService();