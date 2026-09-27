// backend/services/transactionTypeService.js
const { Op } = require('sequelize');
const { TransactionType, Appointment } = require('../models');

const VALID_OFFICES = ['testing', 'treatment'];
const MIN_DURATION = 5;
const MAX_DURATION = 120;

class TransactionTypeService {
  // ─────────────────────────────────────────────
  // Validation helpers
  // ─────────────────────────────────────────────
  validateOffice(office) {
    if (!VALID_OFFICES.includes(office)) {
      const err = new Error('Office must be either "testing" or "treatment"');
      err.status = 400;
      throw err;
    }
  }

  validateDuration(minutes) {
    if (minutes < MIN_DURATION || minutes > MAX_DURATION) {
      const err = new Error(
        `Estimated duration must be between ${MIN_DURATION} and ${MAX_DURATION} minutes`
      );
      err.status = 400;
      throw err;
    }
  }

  async ensureNameUnique(name, excludeId = null) {
    const where = { name };
    if (excludeId) where.id = { [Op.ne]: excludeId };

    const existing = await TransactionType.findOne({ where });
    if (existing) {
      const err = new Error('Transaction type with this name already exists');
      err.status = 409;
      throw err;
    }
  }

  async findOrFail(id) {
  const type = await TransactionType.findByPk(id);
  if (!type) {
    const err = new Error('Transaction type not found');
    err.status = 404;
    throw err;
  }
  return type;
}

  // ─────────────────────────────────────────────
  // Queries
  // ─────────────────────────────────────────────
  async getAll({ office, is_active, include_inactive } = {}) {
    const where = {};

    if (office) where.office = office;

    if (is_active !== undefined) {
      where.is_active = is_active === 'true' || is_active === true;
    } else if (!include_inactive) {
      where.is_active = true;
    }

    const transactionTypes = await TransactionType.findAll({
      where,
      order: [
        ['office', 'ASC'],
        ['name', 'ASC']
      ]
    });

    return {
      data: transactionTypes,
      count: transactionTypes.length
    };
  }

  async getById(id) {
    return this.findOrFail(id);
  }

  // ─────────────────────────────────────────────
  // Mutations
  // ─────────────────────────────────────────────
  async create(payload) {
    const {
      name,
      office,
      estimated_duration_minutes,
      description,
      color_code,
      is_active
    } = payload;

    if (!name || !office || !estimated_duration_minutes) {
      const err = new Error('Name, office, and estimated duration are required');
      err.status = 400;
      throw err;
    }

    this.validateOffice(office);
    this.validateDuration(estimated_duration_minutes);
    await this.ensureNameUnique(name);

    return TransactionType.create({
      name,
      office,
      estimated_duration_minutes,
      description: description || null,
      color_code: color_code || null,
      is_active: is_active !== undefined ? is_active : true
    });
  }

  async update(id, payload) {
    const type = await this.findOrFail(id);
    const {
      name,
      office,
      estimated_duration_minutes,
      description,
      color_code,
      is_active
    } = payload;

    if (office) this.validateOffice(office);
    if (estimated_duration_minutes !== undefined) {
      this.validateDuration(estimated_duration_minutes);
    }
    if (name && name !== type.name) {
      await this.ensureNameUnique(name, type.id);
    }

    await type.update({
      name: name ?? type.name,
      office: office ?? type.office,
      estimated_duration_minutes:
        estimated_duration_minutes ?? type.estimated_duration_minutes,
      description: description !== undefined ? description : type.description,
      color_code: color_code !== undefined ? color_code : type.color_code,
      is_active: is_active !== undefined ? is_active : type.is_active
    });

    await type.reload();
    return type;
  }

  async toggleActive(id) {
    const type = await this.findOrFail(id);

    // Prevent deactivation if there are active appointments
    if (type.is_active) {
      const activeAppointments = await Appointment.count({
        where: {
          transaction_type_id: id,
          status: { [Op.in]: ['pending', 'queued'] }
        }
      });

      if (activeAppointments > 0) {
        const err = new Error(
          'Cannot deactivate transaction type with active appointments'
        );
        err.status = 400;
        throw err;
      }
    }

    await type.update({ is_active: !type.is_active });
    await type.reload();
    return type;
  }

  async delete(id) {
  const type = await this.findOrFail(id);

  const appointmentCount = await Appointment.count({
    where: { transaction_type_id: id }
  });

  if (appointmentCount > 0) {
    const err = new Error(
      `Cannot delete transaction type with ${appointmentCount} existing appointments. Deactivate it instead.`
    );
    err.status = 400;
    throw err;
  }

  await type.destroy();
  return { id };
}

  async restore(id) {
    const type = await TransactionType.findByPk(id, { paranoid: false });
    if (!type) {
      const err = new Error('Transaction type not found');
      err.status = 404;
      throw err;
    }
    await type.restore();
    await type.reload();
    return type;
  }
}

module.exports = new TransactionTypeService();