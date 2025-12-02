const pool = require('../db');

const createDltHash = async (patientId) => {
  try {
    console.log('Creating DLT hash for patient:', patientId);
    
    // Get patient data
    const [patientRows] = await pool.execute(
      'SELECT patient_id, name, date_of_birth, contact_info, consent, hiv_status, created_at FROM patients WHERE patient_id = ?',
      [patientId]
    );

    if (patientRows.length === 0) {
      throw new Error('Patient not found');
    }

    const patient = patientRows[0];
    
    // Calculate hash
    const crypto = require('crypto');
    const dataToHash = {
      patient_id: patient.patient_id,
      name: patient.name,
      date_of_birth: patient.date_of_birth.toISOString().split('T')[0],
      hiv_status: patient.hiv_status,
      consent: Boolean(patient.consent),
      timestamp: patient.created_at.toISOString()
    };

    // Sort keys for consistent hashing
    const sortedData = {};
    Object.keys(dataToHash).sort().forEach(key => {
      sortedData[key] = dataToHash[key];
    });

    const hash = crypto.createHash('sha256').update(JSON.stringify(sortedData)).digest('hex');

    // Store hash in DLT table
    await pool.execute(
      `INSERT INTO dlt_hashes (patient_id, hash, verified) 
       VALUES (?, ?, TRUE)
       ON DUPLICATE KEY UPDATE hash = ?, verified = TRUE, timestamp = CURRENT_TIMESTAMP`,
      [patientId, hash, hash]
    );

    // Update patient DLT status
    await pool.execute(
      'UPDATE patients SET dlt_status = ? WHERE patient_id = ?',
      ['verified', patientId]
    );

    console.log('DLT hash created successfully for patient:', patientId);
    return true;
  } catch (error) {
    console.error('Error in createDltHash:', error.message);
    
    // Update patient DLT status to failed
    try {
      await pool.execute(
        'UPDATE patients SET dlt_status = ? WHERE patient_id = ?',
        ['failed', patientId]
      );
    } catch (updateError) {
      console.error('Error updating DLT status:', updateError.message);
    }
    
    return false;
  }
};

module.exports = {
  createDltHash
};