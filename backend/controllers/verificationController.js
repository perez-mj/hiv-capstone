// backend/controllers/verificationController.js
const verificationService = require('../services/verificationService');
const blockchainAuditService = require('../services/blockchainAuditService');
const { sendSuccess, sendNotFound, sendBadRequest, sendError } = require('../utils/responseHandler');

const verificationController = {
  /**
   * Verify a single patient's data integrity
   */
  async verifyPatient(req, res, next) {
    try {
      const { id } = req.params;
      
      // Check cache first
      const cachedResult = verificationService.getCachedVerification(id);
      if (cachedResult && req.query.no_cache !== 'true') {
        return sendSuccess(res, 'Patient verification completed (cached)', cachedResult);
      }
      
      const result = await verificationService.verifyPatientIntegrity(id);
      
      // Log verification action to blockchain
      await blockchainAuditService.logAction(
        'VERIFY',
        'patients',
        id,
        id,
        null,
        { overall_integrity: result.overall_integrity, tamper_alerts: result.tamper_alerts.length },
        `Patient data verification ${result.overall_integrity ? 'passed' : 'failed'}`,
        req
      ).catch(err => console.error('Blockchain audit log failed:', err));
      
      sendSuccess(res, `Patient verification ${result.overall_integrity ? 'passed' : 'completed with issues'}`, result);
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Verify all patients (batch verification)
   */
  async verifyAllPatients(req, res, next) {
    try {
      const { limit = 100, offset = 0, only_suspicious = false } = req.query;
      
      const results = await verificationService.verifyAllPatients({
        limit: parseInt(limit),
        offset: parseInt(offset),
        onlySuspicious: only_suspicious === 'true'
      });
      
      // Log batch verification to blockchain
      await blockchainAuditService.logAction(
        'VERIFY_BATCH',
        'patients',
        null,
        null,
        null,
        {
          total_verified: results.total_verified,
          passed: results.passed,
          failed: results.failed,
          tamper_alerts: results.summary.tamper_alerts_count
        },
        `Batch verification completed: ${results.passed}/${results.total_verified} passed`,
        req
      ).catch(err => console.error('Blockchain audit log failed:', err));
      
      sendSuccess(res, 'Batch verification completed', results);
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Store current patient snapshot to blockchain
   */
  async storePatientSnapshot(req, res, next) {
    try {
      const { id } = req.params;
      
      const result = await verificationService.storePatientSnapshot(id, req);
      
      await blockchainAuditService.logAction(
        'SNAPSHOT',
        'patients',
        id,
        id,
        null,
        { txid: result.txid, data_hash: result.data_hash },
        `Patient snapshot stored to blockchain`,
        req
      ).catch(err => console.error('Blockchain audit log failed:', err));
      
      sendSuccess(res, result.message, result);
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Get verification history for a patient
   */
  async getVerificationHistory(req, res, next) {
    try {
      const { id } = req.params;
      const { limit = 20 } = req.query;
      
      const history = await verificationService.getVerificationHistory(id, parseInt(limit));
      
      sendSuccess(res, 'Verification history retrieved', {
        patient_id: id,
        history,
        total: history.length
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Get verification dashboard summary
   */
  async getVerificationDashboard(req, res, next) {
    try {
      // Get overall statistics
      const verificationStats = await verificationService.verifyAllPatients({ limit: 500, offset: 0 });
      
      // Get blockchain health info
      const blockchainInfo = await blockchainAuditService.getAuditStatistics();
      
      const summary = {
        last_verification: new Date().toISOString(),
        patients_verified: verificationStats.total_verified,
        patients_passed: verificationStats.passed,
        patients_failed: verificationStats.failed,
        tamper_alerts_total: verificationStats.summary.tamper_alerts_count,
        tamper_alerts_by_severity: verificationStats.summary.by_severity,
        blockchain_health: {
          audit_entries: blockchainInfo.total_entries || 0,
          streams_available: await blockchainAuditService.listStreams().then(s => s.length).catch(() => 0),
          is_connected: blockchainAuditService.enabled
        },
        recommendations: this.generateDashboardRecommendations(verificationStats)
      };
      
      sendSuccess(res, 'Verification dashboard summary', summary);
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Fix discrepancies by restoring from blockchain
   */
  async restoreFromBlockchain(req, res, next) {
    try {
      const { id } = req.params;
      const { record_txid, confirm = false } = req.body;
      
      if (!confirm) {
        // Return what would be restored
        const blockchainRecords = await blockchainAuditService.getPatientRecords(id, null, 1, 0);
        
        if (blockchainRecords.length === 0) {
          return sendNotFound(res, 'No blockchain records found for this patient');
        }
        
        const targetRecord = record_txid 
          ? blockchainRecords.find(r => r.blockchain_txid === record_txid)
          : blockchainRecords[0];
        
        if (!targetRecord) {
          return sendNotFound(res, 'Specified blockchain record not found');
        }
        
        // Get current patient data for comparison
        const pool = require('../db');
        const [patientRows] = await pool.execute('SELECT * FROM patients WHERE id = ?', [id]);
        
        if (!patientRows[0]) {
          return sendNotFound(res, 'Patient not found in database');
        }
        
        const differences = verificationService.comparePatientRecords(
          patientRows[0],
          targetRecord.record_data?.snapshot_data || targetRecord.record_data?.enrollment_data || {}
        );
        
        return sendSuccess(res, 'Restore preview', {
          blockchain_record: {
            txid: targetRecord.blockchain_txid,
            timestamp: targetRecord.blockchain_time,
            record_type: targetRecord.record_type
          },
          current_data: patientRows[0],
          blockchain_data: targetRecord.record_data?.snapshot_data || targetRecord.record_data?.enrollment_data,
          differences,
          would_restore_fields: differences.map(d => d.field),
          requires_confirmation: true
        });
      }
      
      // Perform actual restore
      const blockchainRecords = await blockchainAuditService.getPatientRecords(id, null, 1, 0);
      const targetRecord = record_txid 
        ? blockchainRecords.find(r => r.blockchain_txid === record_txid)
        : blockchainRecords[0];
      
      if (!targetRecord) {
        return sendNotFound(res, 'Blockchain record not found for restoration');
      }
      
      const restoredData = targetRecord.record_data?.snapshot_data || targetRecord.record_data?.enrollment_data;
      
      if (!restoredData) {
        return sendBadRequest(res, 'Blockchain record does not contain complete patient data');
      }
      
      // Update patient record
      const pool = require('../db');
      const updateFields = [];
      const updateValues = [];
      
      const updatableFields = [
        'first_name', 'last_name', 'middle_name', 'date_of_birth', 'sex',
        'address', 'contact_number', 'hiv_status', 'diagnosis_date',
        'art_start_date', 'latest_cd4_count', 'latest_viral_load'
      ];
      
      for (const field of updatableFields) {
        if (restoredData[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          updateValues.push(restoredData[field]);
        }
      }
      
      updateFields.push('updated_at = NOW()');
      updateValues.push(id);
      
      await pool.execute(
        `UPDATE patients SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
      
      // Log restoration to blockchain
      await blockchainAuditService.logAction(
        'RESTORE',
        'patients',
        id,
        id,
        patientRows[0],
        restoredData,
        `Patient data restored from blockchain snapshot (txid: ${targetRecord.blockchain_txid})`,
        req
      ).catch(err => console.error('Blockchain audit log failed:', err));
      
      // Store new verification snapshot
      await verificationService.storePatientSnapshot(id, req);
      
      // Get updated patient
      const [updatedRows] = await pool.execute('SELECT * FROM patients WHERE id = ?', [id]);
      
      sendSuccess(res, 'Patient data restored from blockchain successfully', {
        restored_patient: updatedRows[0],
        restored_from_txid: targetRecord.blockchain_txid,
        restored_at: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Generate dashboard recommendations
   */
  generateDashboardRecommendations(stats) {
    const recommendations = [];
    
    if (stats.patients_failed > 0) {
      recommendations.push({
        priority: 'high',
        message: `${stats.patients_failed} patient(s) failed verification. Review and consider restoring from blockchain.`
      });
    }
    
    if (stats.summary.tamper_alerts_count > 0) {
      const highSeverity = stats.summary.by_severity.high || 0;
      if (highSeverity > 0) {
        recommendations.push({
          priority: 'critical',
          message: `${highSeverity} high-severity tamper alerts detected. Immediate investigation required.`
        });
      }
    }
    
    if (!stats.blockchain_health?.is_connected) {
      recommendations.push({
        priority: 'high',
        message: 'Blockchain connection is not available. Verification results may be incomplete.'
      });
    }
    
    if (stats.patients_verified === 0) {
      recommendations.push({
        priority: 'medium',
        message: 'No patients have been verified yet. Run verification to establish baseline integrity.'
      });
    }
    
    return recommendations;
  }
};

module.exports = verificationController;