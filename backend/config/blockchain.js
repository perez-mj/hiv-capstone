// backend/config/blockchain.js
require('dotenv').config();
module.exports = {
  host:     process.env.BLOCKCHAIN_HOST,
  port:     process.env.BLOCKCHAIN_PORT,
  rpcPort:  process.env.BLOCKCHAIN_RPC_PORT,
  chain:    process.env.BLOCKCHAIN_CHAIN,
  stream:   process.env.BLOCKCHAIN_STREAM,   
  user:     process.env.BLOCKCHAIN_RPC_USER,
  password: process.env.BLOCKCHAIN_RPC_PASSWORD
};