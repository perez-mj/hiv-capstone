// backend/config/fabric-config.js
const fabricConfig = {
  walletPath: './wallet',
  connectionProfilePath: './config/connection.json',
  channelName: 'hiv-channel',
  chaincodeName: 'hiv-chaincode',
  mspId: 'Org1MSP',
  caUrl: 'http://localhost:7054',
  adminName: 'admin',
  adminPassword: 'adminpw',
  orgName: 'Org1',
  peerEndpoint: 'grpc://localhost:7051',
  eventHubEndpoint: 'grpc://localhost:7053',
  ordererEndpoint: 'grpc://localhost:7050'
};

// For development - mock mode if Fabric network is not running
fabricConfig.useMock = process.env.NODE_ENV === 'development' && 
                       process.env.USE_MOCK_DLT !== 'false';

module.exports = fabricConfig;