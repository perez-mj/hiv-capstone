// backend/routes/admin.js
const express = require('express');
const router = express.Router();
const db = require('../models');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');

// All admin routes require authentication and admin role
router.use(auth);
router.use(roleCheck('admin'));

// Dashboard
router.get('/dashboard/stats', async (req, res) => {
  try {
    const totalUsers = await db.User.count();
    const activeUsers = await db.User.count({ where: { is_active: true } });
    const totalPatients = await db.Patient.count();
    const totalAppointments = await db.Appointment.count();
    
    const recentAudits = await db.AuditLog.count({
      where: {
        created_at: {
          [Op.gte]: new Date(new Date() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    });
    
    const usersByRole = await db.User.findAll({
      attributes: ['role', [db.sequelize.fn('COUNT', db.sequelize.col('role')), 'count']],
      group: ['role']
    });
    
    res.json({
      total_users: totalUsers,
      active_users: activeUsers,
      total_patients: totalPatients,
      total_appointments: totalAppointments,
      recent_audits: recentAudits,
      users_by_role: usersByRole
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User management
router.get('/users', async (req, res) => {
  try {
    const users = await db.User.findAll({
      attributes: { exclude: ['password_hash'] },
      include: [{
        model: db.Patient,
        as: 'Patient',  // This must match the 'as' in the association
        required: false,
        attributes: ['first_name', 'last_name', 'contact_number', 'status']
      }],
      order: [['created_at', 'DESC']]
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { username, email, password, role, office } = req.body;
    
    const existingUser = await db.User.findOne({
      where: { [Op.or]: [{ username }, { email }] }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    
    const user = await db.User.create({
      username,
      email,
      password_hash: password,
      role,
      office: role === 'staff' ? office : null
    });
    
    await db.AuditLog.create({
      user_id: req.user.id,
      action: 'CREATE',
      entity_type: 'User',
      entity_id: user.id,
      new_data: { username, email, role, office },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    const userResponse = user.toJSON();
    delete userResponse.password_hash;
    
    res.status(201).json(userResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role, office, is_active, password } = req.body;
    
    const user = await db.User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const oldData = {
      username: user.username,
      email: user.email,
      role: user.role,
      office: user.office,
      is_active: user.is_active
    };
    
    if (username) user.username = username;
    if (email) user.email = email;
    if (role) user.role = role;
    if (office !== undefined) user.office = role === 'staff' ? office : null;
    if (is_active !== undefined) user.is_active = is_active;
    if (password) user.password_hash = password;
    
    await user.save();
    
    await db.AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE',
      entity_type: 'User',
      entity_id: user.id,
      old_data: oldData,
      new_data: {
        username: user.username,
        email: user.email,
        role: user.role,
        office: user.office,
        is_active: user.is_active
      },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    const userResponse = user.toJSON();
    delete userResponse.password_hash;
    
    res.json(userResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/users/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await db.User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.is_active = false;
    await user.save();
    
    await db.AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE',
      entity_type: 'User',
      entity_id: user.id,
      old_data: { is_active: true },
      new_data: { is_active: false },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


const settingController = require('../controllers/systemSettingController');
// System settings
router.get('/settings/', settingController.getAll);                       // GET    /api/system-settings
router.post('/settings/', settingController.create);                      // POST   /api/system-settings

// ─── Special / aggregate routes (must come before /:id) ───────────
router.get('/settings/object', settingController.getSettingsObject);      // GET    /api/system-settings/object
router.get('/settings/categorized', settingController.getCategorized);    // GET    /api/system-settings/categorized
router.get('/settings/category/:category', settingController.getByCategory); // GET /api/system-settings/category/:category

router.patch('/settings/bulk', settingController.updateMany);             // PATCH  /api/system-settings/bulk

// ─── Key-based routes ─────────────────────────────────────────────
router.get('/settings/key/:key', settingController.getByKey);             // GET    /api/system-settings/key/:key
router.put('/settings/key/:key', settingController.updateByKey);          // PUT    /api/system-settings/key/:key
router.delete('/settings/key/:key', settingController.deleteByKey);       // DELETE /api/system-settings/key/:key

// ─── ID-based routes (must come last) ─────────────────────────────
router.get('/settings/:id', settingController.getById);                   // GET    /api/system-settings/:id
router.put('/settings/:id', settingController.update);                    // PUT    /api/system-settings/:id
router.delete('/settings/:id', settingController.delete);                 // DELETE /api/system-settings/:id

// Audit logs
router.get('/audit-logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, action, entity_type, user_id, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    if (action) where.action = action;
    if (entity_type) where.entity_type = entity_type;
    if (user_id) where.user_id = user_id;
    if (start_date || end_date) {
      where.created_at = {};
      if (start_date) where.created_at[Op.gte] = new Date(start_date);
      if (end_date) where.created_at[Op.lte] = new Date(end_date);
    }
    
    const { count, rows } = await db.AuditLog.findAndCountAll({
      where,
      include: [{
        model: db.User,
        as: 'User',  // Add this alias
        attributes: ['username', 'email', 'role']
      }],
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']]
    });
    
    res.json({
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
      data: rows
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/audit-logs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const log = await db.AuditLog.findByPk(id, {
      include: [{
        model: db.User,
        attributes: ['username', 'email', 'role']
      }]
    });
    
    if (!log) {
      return res.status(404).json({ error: 'Audit log not found' });
    }
    
    res.json(log);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;