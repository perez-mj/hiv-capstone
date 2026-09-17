// backend/config/blockchain.js
require('dotenv').config();
module.exports = {
  host:     process.env.BLOCKCHAIN_HOST || '127.0.0.1',
  port:     process.env.BLOCKCHAIN_PORT || '8571',
  rpcPort:  process.env.BLOCKCHAIN_RPC_PORT || '8572',
  chain:    process.env.BLOCKCHAIN_CHAIN || 'omph_hiv_chain',
  stream:   process.env.BLOCKCHAIN_STREAM || 'patient_audit',   // <-- ADD THIS
  user:     process.env.BLOCKCHAIN_USER || 'multichainrpc',
  password: process.env.BLOCKCHAIN_PASSWORD || '',
};