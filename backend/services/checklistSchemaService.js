// backend/services/checklistSchemaService.js
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const ALLOWED_FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'boolean',
  'enum',
  'multiselect',
  'date',
];

const ALLOWED_KEY_REGEX = /^[a-z][a-z0-9_]*$/;

class ChecklistSchemaError extends Error {
  constructor(message, details) {
    super(message);
    this.status = 400;
    this.details = details;
  }
}

class ChecklistSchemaService {
  // ─────────────────────────────────────────────
  // 1. Sanity-check the admin-defined checklist itself
  // ─────────────────────────────────────────────
  validateChecklistDefinition(checklist) {
    if (!checklist || typeof checklist !== 'object') {
      throw new ChecklistSchemaError('checklist_schema must be an object');
    }
    const { fields } = checklist;
    if (!Array.isArray(fields)) {
      throw new ChecklistSchemaError('checklist_schema.fields must be an array');
    }

    const seen = new Set();
    for (const [i, f] of fields.entries()) {
      const at = `fields[${i}]`;
      if (!f || typeof f !== 'object') {
        throw new ChecklistSchemaError(`${at} must be an object`);
      }
      if (!f.key || typeof f.key !== 'string') {
        throw new ChecklistSchemaError(`${at}.key is required`);
      }
      if (!ALLOWED_KEY_REGEX.test(f.key)) {
        throw new ChecklistSchemaError(
          `${at}.key "${f.key}" must match ${ALLOWED_KEY_REGEX}`
        );
      }
      if (seen.has(f.key)) {
        throw new ChecklistSchemaError(`Duplicate field key "${f.key}"`);
      }
      seen.add(f.key);

      if (!f.label || typeof f.label !== 'string') {
        throw new ChecklistSchemaError(`${at}.label is required`);
      }
      if (!ALLOWED_FIELD_TYPES.includes(f.type)) {
        throw new ChecklistSchemaError(
          `${at}.type "${f.type}" is invalid. Allowed: ${ALLOWED_FIELD_TYPES.join(', ')}`
        );
      }
      if (['enum', 'multiselect'].includes(f.type)) {
        if (!Array.isArray(f.options) || f.options.length === 0) {
          throw new ChecklistSchemaError(`${at}.options must be a non-empty array`);
        }
        if (f.options.some((o) => typeof o !== 'string')) {
          throw new ChecklistSchemaError(`${at}.options must all be strings`);
        }
      }
      if (f.type === 'number') {
        if (f.min !== undefined && typeof f.min !== 'number') {
          throw new ChecklistSchemaError(`${at}.min must be a number`);
        }
        if (f.max !== undefined && typeof f.max !== 'number') {
          throw new ChecklistSchemaError(`${at}.max must be a number`);
        }
        if (f.min !== undefined && f.max !== undefined && f.min > f.max) {
          throw new ChecklistSchemaError(`${at}.min cannot exceed max`);
        }
      }
      if (f.required !== undefined && typeof f.required !== 'boolean') {
        throw new ChecklistSchemaError(`${at}.required must be a boolean`);
      }
    }
    return true;
  }

  // ─────────────────────────────────────────────
  // 2. Compile a checklist into a JSON Schema
  // ─────────────────────────────────────────────
  compile(checklist) {
    const properties = {};
    const required = [];

    for (const f of checklist.fields || []) {
      const prop = {};
      switch (f.type) {
        case 'text':
        case 'textarea':
          prop.type = 'string';
          if (f.maxLength) prop.maxLength = f.maxLength;
          break;
        case 'number':
          prop.type = 'number';
          if (f.min !== undefined) prop.minimum = f.min;
          if (f.max !== undefined) prop.maximum = f.max;
          break;
        case 'boolean':
          prop.type = 'boolean';
          break;
        case 'enum':
          prop.type = 'string';
          prop.enum = f.options;
          break;
        case 'multiselect':
          prop.type = 'array';
          prop.items = { type: 'string', enum: f.options };
          prop.uniqueItems = true;
          break;
        case 'date':
          prop.type = 'string';
          prop.format = 'date-time';
          break;
        default:
          prop.type = 'string';
      }
      properties[f.key] = prop;
      if (f.required) required.push(f.key);
    }

    return {
      type: 'object',
      properties,
      required,
      additionalProperties: false,
    };
  }

  // ─────────────────────────────────────────────
  // 3. Validate encounter.data against a transaction type
  // ─────────────────────────────────────────────
  validateEncounterData(transactionType, data) {
    const schema = this.compile(transactionType.checklist_schema || { fields: [] });
    const validate = ajv.compile(schema);

    if (!validate(data || {})) {
      const err = new Error('Encounter data does not match the checklist for this transaction type');
      err.status = 422;
      err.details = validate.errors;
      throw err;
    }
    return true;
  }
}

module.exports = new ChecklistSchemaService();
module.exports.ChecklistSchemaError = ChecklistSchemaError;