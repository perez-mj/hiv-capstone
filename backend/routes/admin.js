// backend/routes/admin.js
const express = require('express');
const router = express.Router();
const db = require('../models');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');

router.use(auth);
router.use(roleCheck('admin'));

/* ------------------------------------------------------------------ */
/* DASHBOARD STATS                                                     */
/* ------------------------------------------------------------------ */
router.get('/dashboard/stats', async (req, res) => {
  try {
    /* ============ BASIC COUNTS ============ */
    const totalUsers = await db.User.count();
    const activeUsers = await db.User.count({ where: { is_active: true } });
    const totalPatients = await db.Patient.count();
    const totalAppointments = await db.Appointment.count();

    const recentAudits = await db.AuditLog.count({
      where: {
        created_at: {
          [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    const usersByRole = await db.User.findAll({
      attributes: [
        'role',
        [db.sequelize.fn('COUNT', db.sequelize.col('role')), 'count'],
      ],
      group: ['role'],
      raw: true,
    });

    const appointmentsByStatus = await db.Appointment.findAll({
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('status')), 'count'],
      ],
      group: ['status'],
      raw: true,
    });

    /* ============ PULL ALL PATIENTS (encrypted fields) ============ */
    // Patient PII columns are encrypted TEXT; we must aggregate in JS.
    const allPatients = await db.Patient.findAll({
      attributes: [
        'id',
        'birth_date',
        'gender',
        'purpose',
        'status',
        'enrollment_date',
        'treatment_transition_date',
      ],
    });

    const calcAge = (birthDate) => {
      if (!birthDate) return null;
      const dob = new Date(birthDate);
      if (isNaN(dob.getTime())) return null;
      const now = new Date();
      let age = now.getFullYear() - dob.getFullYear();
      const m = now.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
      return age >= 0 && age < 130 ? age : null;
    };

    /* ---------- AGE DISTRIBUTION ---------- */
    const ageBuckets = {
      '0-5': 0,
      '6-12': 0,
      '13-17': 0,
      '18-24': 0,
      '25-34': 0,
      '35-44': 0,
      '45-54': 0,
      '55-64': 0,
      '65+': 0,
      Unknown: 0,
    };

    /* ---------- GENDER DISTRIBUTION ---------- */
    const genderBuckets = { Male: 0, Female: 0, Other: 0, Unknown: 0 };

    /* ---------- PURPOSE DISTRIBUTION ---------- */
    const purposeBuckets = {};

    /* ---------- STATUS (kept internally for KPI derivation) ---------- */
    const statusBuckets = { testing: 0, treatment: 0, indeterminate: 0, other: 0 };

    /* ---------- PEDIATRIC ADOLESCENT BUCKET (13-24) ---------- */
    let youthCount = 0;
    let adultCount = 0;
    let pediatricCount = 0;

    /* ---------- ENROLLMENT TREND (last 6 months) ---------- */
    const enrollTrend = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      enrollTrend[key] = 0;
    }

    /* ---------- TREATMENT TRANSITIONS TREND (last 6 months) ---------- */
    const transitionTrend = {};
    Object.keys(enrollTrend).forEach((k) => (transitionTrend[k] = 0));

    /* ---------- NEWLY ENROLLED (30d) ---------- */
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    for (const p of allPatients) {
      // Age
      const age = calcAge(p.birth_date);
      if (age === null) ageBuckets.Unknown++;
      else if (age <= 5) ageBuckets['0-5']++;
      else if (age <= 12) ageBuckets['6-12']++;
      else if (age <= 17) ageBuckets['13-17']++;
      else if (age <= 24) ageBuckets['18-24']++;
      else if (age <= 34) ageBuckets['25-34']++;
      else if (age <= 44) ageBuckets['35-44']++;
      else if (age <= 54) ageBuckets['45-54']++;
      else if (age <= 64) ageBuckets['55-64']++;
      else ageBuckets['65+']++;

      if (age !== null) {
        if (age < 13) pediatricCount++;
        else if (age <= 24) youthCount++;
        else adultCount++;
      }

      // Gender
      const g = (p.gender || '').toLowerCase();
      if (g === 'male') genderBuckets.Male++;
      else if (g === 'female') genderBuckets.Female++;
      else if (g) genderBuckets.Other++;
      else genderBuckets.Unknown++;

      // Purpose (free-text, encrypted) — group by trimmed lowercase
      const purposeKey = (p.purpose || 'Unspecified').trim() || 'Unspecified';
      const normalizedPurpose =
        purposeKey.length > 40 ? purposeKey.slice(0, 40) + '…' : purposeKey;
      purposeBuckets[normalizedPurpose] =
        (purposeBuckets[normalizedPurpose] || 0) + 1;

      // Status
      const st = (p.status || '').toLowerCase();
      if (st === 'testing') statusBuckets.testing++;
      else if (st === 'treatment') statusBuckets.treatment++;
      else if (st === 'indeterminate') statusBuckets.indeterminate++;
      else statusBuckets.other++;

      // Enrollment trend
      if (p.enrollment_date) {
        const ed = new Date(p.enrollment_date);
        if (!isNaN(ed.getTime())) {
          const key = `${ed.getFullYear()}-${String(ed.getMonth() + 1).padStart(2, '0')}`;
          if (key in enrollTrend) enrollTrend[key]++;
        }
      }

      // Transition trend
      if (p.treatment_transition_date) {
        const td = new Date(p.treatment_transition_date);
        if (!isNaN(td.getTime())) {
          const key = `${td.getFullYear()}-${String(td.getMonth() + 1).padStart(2, '0')}`;
          if (key in transitionTrend) transitionTrend[key]++;
        }
      }
    }

    const ageDistribution = Object.entries(ageBuckets).map(([range, count]) => ({
      range,
      count,
    }));

    const genderDistribution = Object.entries(genderBuckets).map(
      ([gender, count]) => ({ gender, count })
    );

    // Sort purposes by count desc, cap at 8 slices for readability
    const purposeDistribution = Object.entries(purposeBuckets)
      .map(([purpose, count]) => ({ purpose, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const patientsByStatus = Object.entries(statusBuckets).map(
      ([status, count]) => ({ status, count })
    );

    /* ============ NEWLY ENROLLED (30d) ============ */
    const newlyEnrolled30d = await db.Patient.count({
      where: { enrollment_date: { [Op.gte]: thirtyDaysAgo } },
    });

    /* ============ APPOINTMENTS: last 14 days ============ */
    const since = new Date();
    since.setDate(since.getDate() - 13);
    since.setHours(0, 0, 0, 0);

    const recentAppointments = await db.Appointment.findAll({
      attributes: ['appointment_date', 'status'],
      where: { appointment_date: { [Op.gte]: since } },
      raw: true,
    });

    const apptTrendMap = {};
    for (let i = 0; i < 14; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      apptTrendMap[d.toISOString().split('T')[0]] = 0;
    }
    for (const a of recentAppointments) {
      const key =
        typeof a.appointment_date === 'string'
          ? a.appointment_date
          : a.appointment_date.toISOString().split('T')[0];
      if (key in apptTrendMap) apptTrendMap[key]++;
    }
    const appointmentTrend = Object.entries(apptTrendMap).map(([date, count]) => ({
      date,
      count,
    }));

    /* ============ NO-SHOW RATE (last 30d) ============ */
    const last30Appts = await db.Appointment.findAll({
      where: {
        appointment_date: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      attributes: ['status'],
      raw: true,
    });
    const total30 = last30Appts.length || 1;
    const noShow30 = last30Appts.filter((a) => a.status === 'no-show').length;
    const cancelled30 = last30Appts.filter((a) => a.status === 'cancelled').length;
    const completed30 = last30Appts.filter((a) => a.status === 'completed').length;

    const noShowRate30d = Math.round((noShow30 / total30) * 1000) / 10;
    const cancellationRate30d = Math.round((cancelled30 / total30) * 1000) / 10;
    const completionRate30d = Math.round((completed30 / total30) * 1000) / 10;

    /* ============ TODAY'S QUEUE ============ */
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysQueues = await db.Queue.findAll({
      where: { date: todayStr },
      attributes: [
        'office',
        'completed_count',
        'skipped_count',
        'noshow_count',
        'current_number',
      ],
      raw: true,
    });

    // Live queue: count of entries still waiting/in-progress today
    const todaysEntries = await db.QueueEntry.findAll({
      where: { status: ['waiting', 'in-progress'] },
      include: [
        {
          model: db.Queue,
          as: 'Queue',
          where: { date: todayStr },
          attributes: [],
          required: true,
        },
      ],
      attributes: ['status'],
      raw: true,
    });
    const waitingNow = todaysEntries.filter((e) => e.status === 'waiting').length;
    const inProgressNow = todaysEntries.filter((e) => e.status === 'in-progress').length;

    const queueToday = {
      waiting: waitingNow,
      in_progress: inProgressNow,
      completed: todaysQueues.reduce((s, q) => s + (q.completed_count || 0), 0),
      skipped: todaysQueues.reduce((s, q) => s + (q.skipped_count || 0), 0),
      no_show: todaysQueues.reduce((s, q) => s + (q.noshow_count || 0), 0),
    };

    /* ============ ENCOUNTERS THIS MONTH ============ */
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const encountersThisMonth = await db.Encounter.count({
      where: {
        occurred_at: { [Op.gte]: monthStart },
        voided_at: null,
      },
    });

    /* ============ PATIENTS RECENTLY ACTIVE (visited in last 90d) ============ */
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const recentlyActivePatients = await db.Encounter.count({
      distinct: true,
      col: 'patient_id',
      where: {
        occurred_at: { [Op.gte]: ninetyDaysAgo },
        voided_at: null,
      },
    });

    /* ============ RETENTION: patients with a visit in last 180d ============ */
    const oneEightyAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const retainedPatients = await db.Encounter.count({
      distinct: true,
      col: 'patient_id',
      where: {
        occurred_at: { [Op.gte]: oneEightyAgo },
        voided_at: null,
      },
    });

    const retentionRate =
      totalPatients > 0
        ? Math.round((retainedPatients / totalPatients) * 1000) / 10
        : 0;

    /* ============ RESPONSE ============ */
    res.json({
      /* core KPIs */
      total_users: totalUsers,
      active_users: activeUsers,
      total_patients: totalPatients,
      total_appointments: totalAppointments,
      recent_audits: recentAudits,

      /* patient population */
      age_distribution: ageDistribution,
      gender_distribution: genderDistribution,
      purpose_distribution: purposeDistribution,
      patients_by_status: patientsByStatus,
      population_mix: {
        pediatric: pediatricCount,
        youth: youthCount,
        adult: adultCount,
      },

      /* enrollment & transitions */
      enrollment_trend: Object.entries(enrollTrend).map(([month, count]) => ({
        month,
        count,
      })),
      transition_trend: Object.entries(transitionTrend).map(([month, count]) => ({
        month,
        count,
      })),
      newly_enrolled_30d: newlyEnrolled30d,

      /* appointments */
      appointments_by_status: appointmentsByStatus,
      appointment_trend: appointmentTrend,
      no_show_rate_30d: noShowRate30d,
      cancellation_rate_30d: cancellationRate30d,
      completion_rate_30d: completionRate30d,

      /* queue */
      queue_today: queueToday,

      /* clinical activity */
      encounters_this_month: encountersThisMonth,
      recently_active_patients_90d: recentlyActivePatients,
      retention_rate_180d: retentionRate,

      /* user breakdown */
      users_by_role: usersByRole,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

/* ------------------------------------------------------------------ */
/* USERS                                                               */
/* ------------------------------------------------------------------ */
router.get('/users', async (req, res) => {
  try {
    const users = await db.User.findAll({
      attributes: { exclude: ['password_hash'] },
      include: [
        {
          model: db.Patient,
          as: 'Patient',
          required: false,
          attributes: [
            'id',
            'first_name',
            'last_name',
            'contact_number',
            'status',
            'patient_facility_code',
          ],
        },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { username, email, password, role, office } = req.body;

    if (!username || !email || !password || !role) {
      return res
        .status(400)
        .json({ error: 'username, email, password, and role are required' });
    }
    if (!['patient', 'staff', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    if (role === 'staff' && !office) {
      return res.status(400).json({ error: 'Office is required for staff' });
    }

    const existingUser = await db.User.findOne({
      where: { [Op.or]: [{ username }, { email }] },
    });
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const user = await db.User.create({
      username,
      email,
      password_hash: password,
      role,
      office: role === 'staff' ? office : null,
    });

    await db.AuditLog.create({
      user_id: req.user.id,
      action: 'CREATE',
      entity_type: 'User',
      entity_id: String(user.id),
      new_data: { username, email, role, office: user.office },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
    });

    const userResponse = user.toJSON();
    delete userResponse.password_hash;
    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Create user error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role, office, is_active, password } = req.body;

    const user = await db.User.findByPk(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (role && !['patient', 'staff', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (Number(id) === Number(req.user.id)) {
      if (is_active === false) {
        return res
          .status(400)
          .json({ error: 'You cannot deactivate your own account' });
      }
      if (role && role !== 'admin') {
        return res
          .status(400)
          .json({ error: 'You cannot change your own admin role' });
      }
    }

    const oldData = {
      username: user.username,
      email: user.email,
      role: user.role,
      office: user.office,
      is_active: user.is_active,
    };

    if (username) user.username = username;
    if (email) user.email = email;
    if (role) user.role = role;
    if (office !== undefined) {
      user.office = user.role === 'staff' ? office : null;
    } else if (role && role !== 'staff') {
      user.office = null;
    }
    if (is_active !== undefined) user.is_active = is_active;
    if (password) user.password_hash = password;

    await user.save();

    await db.AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE',
      entity_type: 'User',
      entity_id: String(user.id),
      old_data: oldData,
      new_data: {
        username: user.username,
        email: user.email,
        role: user.role,
        office: user.office,
        is_active: user.is_active,
      },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
    });

    const userResponse = user.toJSON();
    delete userResponse.password_hash;
    res.json(userResponse);
  } catch (error) {
    console.error('Update user error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

router.post('/users/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;
    if (Number(id) === Number(req.user.id)) {
      return res
        .status(400)
        .json({ error: 'You cannot deactivate your own account' });
    }

    const user = await db.User.findByPk(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.is_active) {
      return res.status(400).json({ error: 'User is already deactivated' });
    }

    const oldData = { is_active: user.is_active };
    user.is_active = false;
    await user.save();

    await db.AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE',
      entity_type: 'User',
      entity_id: String(user.id),
      old_data: oldData,
      new_data: { is_active: false },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
    });

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ error: error.message });
  }
});

/* ------------------------------------------------------------------ */
/* SYSTEM SETTINGS                                                     */
/* ------------------------------------------------------------------ */
const settingController = require('../controllers/systemSettingController');
router.get('/settings/', settingController.getAll);
router.post('/settings/', settingController.create);
router.get('/settings/object', settingController.getSettingsObject);
router.get('/settings/categorized', settingController.getCategorized);
router.get('/settings/category/:category', settingController.getByCategory);
router.patch('/settings/bulk', settingController.updateMany);
router.get('/settings/key/:key', settingController.getByKey);
router.put('/settings/key/:key', settingController.updateByKey);
router.delete('/settings/key/:key', settingController.deleteByKey);
router.get('/settings/:id', settingController.getById);
router.put('/settings/:id', settingController.update);
router.delete('/settings/:id', settingController.delete);

/* ------------------------------------------------------------------ */
/* AUDIT LOGS                                                          */
/* ------------------------------------------------------------------ */
router.get('/audit-logs', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      entity_type,
      user_id,
      start_date,
      end_date,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

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
      include: [
        {
          model: db.User,
          as: 'User',
          attributes: ['id', 'username', 'email', 'role'],
        },
      ],
      limit: limitNum,
      offset,
      order: [['created_at', 'DESC']],
    });

    res.json({
      total: count,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(count / limitNum),
      data: rows,
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
      include: [
        {
          model: db.User,
          as: 'User',
          attributes: ['id', 'username', 'email', 'role'],
        },
      ],
    });
    if (!log) return res.status(404).json({ error: 'Audit log not found' });
    res.json(log);
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;