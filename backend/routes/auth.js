// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../models');
const auth = require('../middleware/auth');


// Helper to generate refresh token
const generateRefreshToken = async (userId, ip, userAgent) => {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

  const refreshToken = await db.RefreshToken.create({
    token,
    user_id: userId,
    expires_at: expiresAt,
    ip_address: ip,
    user_agent: userAgent
  });

  return refreshToken.token;
};

// Register new patient
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, patient_details } = req.body;
    
    const existingUser = await db.User.findOne({
      where: { [db.Sequelize.Op.or]: [{ username }, { email }] }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    
    const user = await db.User.create({
      username,
      email,
      password_hash: password,
      role: 'patient',
      is_active: true
    });
    
    const patient = await db.Patient.create({
      user_id: user.id,
      ...patient_details
    });
    
    const token = jwt.sign(
      { user_id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY }
    );
    
    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      patient
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await db.User.findOne({
      where: { username }
    });
    
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValid = await user.validatePassword(password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    user.last_login = new Date();
    await user.save();
    
    // Generate access token (short-lived)
    const accessToken = jwt.sign(
      { user_id: user.id, role: user.role, office: user.office },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '15m' }
    );
    
    // Generate refresh token (long-lived)
    const refreshToken = await generateRefreshToken(
      user.id,
      req.ip,
      req.get('User-Agent')
    );
    
    await db.AuditLog.create({
      user_id: user.id,
      action: 'LOGIN',
      entity_type: 'User',
      entity_id: user.id,
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 900, // 15 minutes in seconds
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        office: user.office
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Logout
router.post('/logout', auth, async (req, res) => {
  try {
    // Revoke all refresh tokens for this user
    await db.RefreshToken.update(
      { revoked: true },
      { where: { user_id: req.user.id } }
    );

    await db.AuditLog.create({
      user_id: req.user.id,
      action: 'LOGOUT',
      entity_type: 'User',
      entity_id: req.user.id,
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Find valid refresh token
    const tokenRecord = await db.RefreshToken.findOne({
      where: {
        token: refresh_token,
        revoked: false,
        expires_at: { [db.Sequelize.Op.gt]: new Date() }
      },
      include: [{
        model: db.User,
        as: 'user',
        attributes: ['id', 'username', 'email', 'role', 'office', 'is_active']
      }]
    });

    if (!tokenRecord) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = tokenRecord.user;
    
    if (!user.is_active) {
      return res.status(401).json({ error: 'User account is deactivated' });
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      { user_id: user.id, role: user.role, office: user.office },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '15m' }
    );

    // Optional: Rotate refresh token (issue new one)
    const newRefreshToken = await generateRefreshToken(
      user.id,
      req.ip,
      req.get('User-Agent')
    );

    // Revoke old refresh token
    tokenRecord.revoked = true;
    await tokenRecord.save();

    await db.AuditLog.create({
      user_id: user.id,
      action: 'TOKEN_REFRESH',
      entity_type: 'User',
      entity_id: user.id,
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.json({
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token_type: 'Bearer',
      expires_in: 900
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change password
router.post('/change-password', auth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const user = req.user;
    
    const isValid = await user.validatePassword(current_password);
    if (!isValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    user.password_hash = new_password;
    await user.save();
    
    await db.AuditLog.create({
      user_id: user.id,
      action: 'PASSWORD_CHANGE',
      entity_type: 'User',
      entity_id: user.id,
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = req.user.toJSON();
    delete user.password_hash;
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;