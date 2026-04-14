// backend/services/encryptionService.js
const crypto = require('crypto');

class EncryptionService {
  constructor() {
    // Store this key in environment variables!
    // Generate with: crypto.randomBytes(32).toString('hex')
    this.encryptionKey = process.env.BLOCKCHAIN_ENCRYPTION_KEY;
    this.algorithm = 'aes-256-gcm';
    
    if (!this.encryptionKey) {
      console.error('⚠️  BLOCKCHAIN_ENCRYPTION_KEY not set in environment variables!');
    }
  }

  encrypt(text) {
    if (!text) return null;
    
    try {
      // Convert to string if object
      const stringData = typeof text === 'object' ? JSON.stringify(text) : String(text);
      
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        this.algorithm, 
        Buffer.from(this.encryptionKey, 'hex'), 
        iv
      );
      
      let encrypted = cipher.update(stringData, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted: true,
        data: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      console.error('Encryption error:', error);
      return null;
    }
  }

  decrypt(encryptedData) {
    if (!encryptedData || !encryptedData.encrypted) {
      return encryptedData;
    }
    
    try {
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        Buffer.from(this.encryptionKey, 'hex'),
        Buffer.from(encryptedData.iv, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
      
      let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      // Try to parse as JSON if it looks like an object
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (error) {
      console.error('Decryption error:', error);
      return null;
    }
  }
  
  // For partial encryption (keep non-sensitive data readable)
  encryptSensitiveFields(data, sensitiveFields = ['patient_id', 'user_id', 'username', 'old_values', 'new_values', 'ip_address']) {
    if (!data) return data;
    
    const encrypted = { ...data };
    
    sensitiveFields.forEach(field => {
      if (encrypted[field] !== undefined && encrypted[field] !== null) {
        encrypted[field] = this.encrypt(encrypted[field]);
      }
    });
    
    return encrypted;
  }
  
  // Create a hash of sensitive data for verification without exposing it
  hashData(data) {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }
}

module.exports = new EncryptionService();