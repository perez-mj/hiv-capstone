const pool = require('../db');

const generateBiometricHash = (biometricData) => {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(biometricData).digest('hex');
};

const createBiometricLink = async (patientId, biometricType = 'fingerprint') => {
  try {
    console.log('Creating biometric link for patient:', patientId);
    
    // Verify patient exists
    const [patientRows] = await pool.execute(
      'SELECT patient_id, name FROM patients WHERE patient_id = ?',
      [patientId]
    );

    if (patientRows.length === 0) {
      throw new Error('Patient not found');
    }

    const patient = patientRows[0];
    
    // Generate mock biometric data (in real scenario, this would come from biometric device)
    const biometricData = `biometric_${patientId}_${Date.now()}`;
    const biometricHash = generateBiometricHash(biometricData);

    // Store biometric link
    await pool.execute(
      `INSERT INTO biometric_links 
       (patient_id, biometric_type, biometric_data, biometric_hash, is_active) 
       VALUES (?, ?, ?, ?, TRUE)
       ON DUPLICATE KEY UPDATE 
       biometric_data = ?, biometric_hash = ?, is_active = TRUE, updated_at = CURRENT_TIMESTAMP`,
      [patientId, biometricType, biometricData, biometricHash, 
       biometricData, biometricHash]
    );

    console.log('Biometric link created successfully for patient:', patientId);
    return true;
  } catch (error) {
    console.error('Error in createBiometricLink:', error.message);
    return false;
  }
};

module.exports = {
  createBiometricLink,
  generateBiometricHash
};