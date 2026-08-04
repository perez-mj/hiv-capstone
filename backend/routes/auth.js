// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../models');
const auth = require('../middleware/auth');

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
    
    const token = jwt.sign(
      { user_id: user.id, role: user.role, office: user.office },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY }
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
      token,
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

// Logout
router.post('/logout', auth, async (req, res) => {
  try {
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

module.exports = router;