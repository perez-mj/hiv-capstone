// routes/dlt-routes.js (Fixed)
const express = require('express');
const router = express.Router();
const fabricService = require('../services/fabric-service');
const DltHash = require('../models/dlt-hash');

router.post('/store-hash', async (req, res) => {
  try {
    const { patientId, consentStatus, hivStatus } = req.body;
    
    if (!patientId || !consentStatus || !hivStatus) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: patientId, consentStatus, hivStatus' 
      });
    }
    
    const dataString = `${patientId}:${consentStatus}:${hivStatus}:${Date.now()}`;
    const dataHash = require('crypto').createHash('sha256').update(dataString).digest('hex');
    
    const dltResult = await fabricService.storeHash(
      patientId, 
      dataHash, 
      new Date().toISOString()
    );
    
    await DltHash.create({
      patient_id: patientId,
      data_hash: dataHash,
      transaction_id: dltResult.txId,
      timestamp: new Date()
    });
    
    res.json({ 
      success: true, 
      data: {
        hash: dataHash, 
        transactionId: dltResult.txId,
        patientId: patientId
      },
      message: 'Hash stored successfully on DLT'
    });
    
  } catch (error) {
    console.error('DLT store hash error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

router.get('/verify/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const latestHash = await DltHash.findOne({
      where: { patient_id: patientId },
      order: [['timestamp', 'DESC']]
    });
    
    if (!latestHash) {
      return res.status(404).json({ 
        success: false,
        error: 'No hash found for patient' 
      });
    }
    
    const verification = await fabricService.verifyHash(
      patientId, 
      latestHash.data_hash
    );
    
    res.json({
      success: true,
      data: {
        patientId,
        hash: latestHash.data_hash,
        verified: verification.verified,
        matches: verification.matches,
        lastVerified: new Date(),
        transactionId: latestHash.transaction_id
      }
    });
    
  } catch (error) {
    console.error('DLT verify error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Add history endpoint
router.get('/history/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const history = await fabricService.getHashHistory(patientId);
    
    res.json({
      success: true,
      data: history
    });
    
  } catch (error) {
    console.error('DLT history error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;



// 1. Dashboard/Analytics Page

//     System Overview: Total patients, consent statistics, HIV status breakdown

//     DLT Status: Last hash timestamp, verification success rate

//     Recent Activity: Latest enrollments and audits

//     Quick Actions: Links to key functions

// 2. Patient Management Page

//     Search/Filter: By name, patient ID, biometric ID, date ranges

//     Patient List: Table view with key information

//     View Details: Modal or separate page for full patient record

//     Edit/Update: Modify patient information (with audit trail)

//     DLT Status: Visual indicators of hash verification status

// 3. Enrollment Page (You have this)

//     Registration Form: All required fields

//     Consent Capture: Clear consent agreement

//     Auto-Generated IDs: Patient ID generation

//     DLT Trigger: Automatic hash creation on submission

// 4. DLT Verification Page

//     Batch Verification: Verify multiple records at once

//     Single Record Check: Detailed verification for specific patients

//     Verification History: Timeline of verification attempts

//     Discrepancy Reports: Highlight mismatched hashes

// 5. Biometric Management Page

//     Link Biometric IDs: Connect biometric IDs to patient records

//     Simulation Tools: Test biometric lookup functionality

//     Usage Logs: Track biometric check-ins

//     Manage Links: Activate/deactivate biometric associations

// 6. Audit & Security Page

//     Activity Logs: All system activities with filters

//     Login History: Admin access tracking

//     Data Changes: Modification history for patient records

//     Security Events: Failed login attempts, etc.

// 7. Admin Management Page

//     User Accounts: Create/edit admin users

//     Permission Management: Role-based access (if needed)

//     Password Reset: Admin password management

// 8. Reports & Analytics Page

//     Consent Reports: Consent statistics over time

//     Testing Trends: HIV status patterns

//     DLT Performance: Hash success rates, latency

//     Export Tools: Data export capabilities