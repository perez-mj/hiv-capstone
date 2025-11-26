// backend/chaincode/hiv-chaincode.js
const { Contract } = require('fabric-contract-api');

class HIVChaincode extends Contract {
  async storeHash(ctx, patientId, dataHash, timestamp) {
    const hashData = {
      patientId,
      dataHash,
      timestamp,
      txId: ctx.stub.getTxID()
    };

    const key = `HASH_${patientId}_${timestamp}`;
    await ctx.stub.putState(key, Buffer.from(JSON.stringify(hashData)));
    
    // Emit event
    ctx.stub.setEvent('HashStored', Buffer.from(JSON.stringify(hashData)));
    
    return JSON.stringify({ 
      success: true, 
      txId: ctx.stub.getTxID(),
      message: 'Hash stored successfully' 
    });
  }

  async verifyHash(ctx, patientId, dataHash) {
    const query = {
      selector: {
        patientId: patientId,
        dataHash: dataHash
      }
    };

    const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
    const results = [];
    
    while (true) {
      const res = await iterator.next();
      
      if (res.value && res.value.value.toString()) {
        const val = JSON.parse(res.value.value.toString('utf8'));
        results.push(val);
      }
      
      if (res.done) {
        await iterator.close();
        break;
      }
    }
    
    return JSON.stringify({
      verified: results.length > 0,
      matches: results
    });
  }

  async getHistory(ctx, patientId) {
    const query = {
      selector: {
        patientId: patientId
      }
    };

    const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
    const history = [];
    
    while (true) {
      const res = await iterator.next();
      
      if (res.value && res.value.value.toString()) {
        const val = JSON.parse(res.value.value.toString('utf8'));
        history.push(val);
      }
      
      if (res.done) {
        await iterator.close();
        break;
      }
    }
    
    // Sort by timestamp descending
    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return JSON.stringify({
      patientId,
      history
    });
  }

  async getPatientHashes(ctx, patientId) {
    const query = {
      selector: {
        patientId: patientId
      }
    };

    const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
    const hashes = [];
    
    while (true) {
      const res = await iterator.next();
      
      if (res.value && res.value.value.toString()) {
        const val = JSON.parse(res.value.value.toString('utf8'));
        hashes.push({
          dataHash: val.dataHash,
          timestamp: val.timestamp,
          txId: val.txId
        });
      }
      
      if (res.done) {
        await iterator.close();
        break;
      }
    }
    
    return JSON.stringify(hashes);
  }
}

module.exports = HIVChaincode;