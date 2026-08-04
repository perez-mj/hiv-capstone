module.exports = {
  host: process.env.BLOCKCHAIN_HOST || 'localhost',
  port: process.env.BLOCKCHAIN_PORT || 8332,
  chain: process.env.BLOCKCHAIN_CHAIN || 'chain1',
  user: process.env.BLOCKCHAIN_USER || 'multichain',
  password: process.env.BLOCKCHAIN_PASSWORD || 'password'
};