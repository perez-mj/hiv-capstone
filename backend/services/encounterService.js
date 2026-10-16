// backend/services/encounterService.js
const { Encounter, Patient, TransactionType, User, AuditLog } = require('../models');
const checklistSchemaService = require('./checklistSchemaService');

class EncounterService {
  async assertTransactionTypeMatches(transaction_type_id, office) {
    const tt = await TransactionType.findByPk(transaction_type_id);
    if (!tt) {
      const err = new Error('Transaction type not found');
      err.status = 404;
      throw err;
    }
    if (tt.office !== office) {
      const err = new Error(
        `Transaction type "${tt.name}" belongs to ${tt.office}, not ${office}`
      );
      err.status = 400;
      throw err;
    }
    if (!tt.is_active) {
      const err = new Error('Transaction type is not active');
      err.status = 400;
      throw err;
    }
    return tt;
  }

  async create({ patient_id, staff_id, office, transaction_type_id, data, notes, occurred_at }) {
    if (!patient_id) {
      const err = new Error('patient_id is required'); err.status = 400; throw err;
    }
    const patient = await Patient.findByPk(patient_id);
    if (!patient) {
      const err = new Error('Patient not found'); err.status = 404; throw err;
    }

    const tt = await this.assertTransactionTypeMatches(transaction_type_id, office);

    // ← NEW: validate data against the compiled checklist schema
    checklistSchemaService.validateEncounterData(tt, data);

    const encounter = await Encounter.create({
      patient_id,
      staff_id,
      office,
      transaction_type_id,
      data,
      notes: notes || null,
      occurred_at: occurred_at ? new Date(occurred_at) : new Date(),
      schema_version: tt.schema_version, // ← NEW: snapshot
    });

    return encounter;
  }

  async update(encounter, { data, notes, transaction_type_id }) {
    const oldData = encounter.toJSON();

    let tt = await TransactionType.findByPk(
      transaction_type_id ?? encounter.transaction_type_id
    );
    if (!tt) {
      const err = new Error('Transaction type not found'); err.status = 404; throw err;
    }
    if (tt.office !== encounter.office) {
      const err = new Error('Transaction type does not match encounter office');
      err.status = 400; throw err;
    }

    if (data !== undefined) {
      if (typeof data !== 'object' || data === null) {
        const err = new Error('data must be a JSON object'); err.status = 400; throw err;
      }
      // ← NEW: re-validate whenever data changes
      checklistSchemaService.validateEncounterData(tt, data);
      encounter.data = data;
      // ← CHANGED: keep schema_version in sync with type
      encounter.schema_version = tt.schema_version;
    }
    if (notes !== undefined) encounter.notes = notes;
    if (transaction_type_id !== undefined) {
      encounter.transaction_type_id = transaction_type_id;
    }

    await encounter.save();
    return { encounter, oldData };
  }
}

module.exports = new EncounterService();