// backend/services/blockchainService.js
'use strict';

const db = require('../models');
const audit = require('../utils/audit');
const logger = require('../utils/logger');
const mc = require('../utils/multichainRpc');
const blockchainConfig = require('../config/blockchain');

const STREAM =
  blockchainConfig.stream ||
  process.env.BLOCKCHAIN_STREAM ||
  'patient_audit';


// ===========================================================================
// Shared helpers
// ===========================================================================

/**
 * Decode a MultiChain stream item's `data` field into a parsed object.
 *
 * MultiChain returns `data` as a hex-encoded UTF-8 JSON string when
 * verbose=true, but we're defensive:
 *   - if `data` is missing → null
 *   - if `data` is already an object → return it as-is
 *   - if decoding/parsing fails → log + null (never throws)
 *
 * @param {object} raw - a stream item (from getstreamitem or liststreamitems)
 * @returns {object|null}
 */
function decodeStreamPayload(raw) {
  if (!raw || !raw.data) return null;

  const { data } = raw;

  // Already decoded by the node (some verbose modes / newer builds)
  if (typeof data === 'object') return data;

  if (typeof data !== 'string') {
    logger.warn(
      `[blockchainService] decodeStreamPayload: unexpected data type ` +
      `${typeof data} for txid=${raw.txid || '?'}`
    );
    return null;
  }

  try {
    return JSON.parse(Buffer.from(data, 'hex').toString('utf8'));
  } catch (error) {
    logger.warn(
      `[blockchainService] could not decode stream item ` +
      `${raw.txid || '?'}: ${error.message}`
    );
    return null;
  }
}


class BlockchainService {

  // =========================================================================
  // CHAIN / STREAM STATUS
  // =========================================================================

  async getChainInfo(actorId = null, req = null) {
    const result = await mc.tryRun(['getinfo'], { json: true });

    audit.write({
      userId: actorId,
      action: 'READ',
      entityType: 'Blockchain',
      metadata: { command: 'getinfo', ok: result.ok },
      ipAddress: req?.ip,
      userAgent: req?.get?.('User-Agent')
    });

    return result.ok ? result.data : null;
  }


  async getStreamInfo(stream = STREAM, actorId = null, req = null) {
    const result = await mc.tryRun(
      ['getstreaminfo', stream],
      { json: true }
    );

    audit.write({
      userId: actorId,
      action: 'READ',
      entityType: 'BlockchainStream',
      entityId: stream,
      metadata: { ok: result.ok },
      ipAddress: req?.ip,
      userAgent: req?.get?.('User-Agent')
    });

    return result.ok ? result.data : null;
  }


  async getStatus(actorId = null, req = null) {
    const info = await mc.tryRun(['getinfo'], { json: true });
    const stream = await mc.tryRun(
      ['getstreaminfo', STREAM],
      { json: true }
    );

    audit.write({
      userId: actorId,
      action: 'STATUS',
      entityType: 'Blockchain',
      metadata: { chainOk: info.ok, streamOk: stream.ok },
      ipAddress: req?.ip,
      userAgent: req?.get?.('User-Agent')
    });

    // FIX: return the SAME shape on failure so the frontend never merges
    // stale fields over fresh nulls.
    if (!info.ok) {
      return {
        ok: false,
        chain: blockchainConfig.chain,
        version: null,
        protocol: null,
        blocks: null,
        connections: null,
        nodeaddress: null,
        streams: null,
        miningpaused: null,
        incomingpaused: null,
        rpc: `${blockchainConfig.host}:${blockchainConfig.rpcPort}`,
        stream: STREAM,
        streamExists: false,
        streamRestrict: null,
        error: info.error
      };
    }

    return {
      ok: true,
      chain: info.data.chainname || blockchainConfig.chain,
      version: info.data.version ?? null,
      protocol: info.data.protocolversion ?? null,
      blocks: info.data.blocks ?? 0,
      connections: info.data.connections ?? 0,
      nodeaddress: info.data.nodeaddress ?? null,
      streams: info.data.streams ?? null,
      miningpaused: info.data.miningpaused ?? null,
      incomingpaused: info.data.incomingpaused ?? null,
      rpc: `${blockchainConfig.host}:${blockchainConfig.rpcPort}`,
      stream: STREAM,
      streamExists: stream.ok,
      streamRestrict: stream.ok ? stream.data.restrict : null
    };
  }


  // =========================================================================
  // ANCHORING
  // =========================================================================

  /**
   * Publish a structured record to the MultiChain stream.
   * Throws on failure — business code should use anchorSafe().
   */
  async anchor(type, entityId, payload, actorId = null, extra = {}) {
    // --- Input validation: catch the "undefined entityId" bug early ---
    if (!type || typeof type !== 'string') {
      throw new Error('anchor: `type` is required');
    }
    if (entityId === undefined || entityId === null || entityId === '') {
      throw new Error(`anchor: \`entityId\` is required for type="${type}"`);
    }

    const record = {
      type,
      entity_id: entityId,
      actor_id: actorId,
      ts: new Date().toISOString(),
      payload_hash: mc.hashPayload(payload),
      ...extra
    };

    const hex = Buffer
      .from(JSON.stringify(record), 'utf8')
      .toString('hex');

    const key = `${type}:${entityId}`;

    const txid = await mc.run([
      'publish',
      STREAM,
      key,
      hex
    ]);

    audit.write({
      userId: actorId,
      action: 'ANCHOR',
      entityType: 'BlockchainItem',
      entityId: key,
      metadata: {
        txid,
        payload_hash: record.payload_hash,
        stream: STREAM
      },
      ipAddress: null
    });

    return { txid, hash: record.payload_hash, record };
  }


  /**
   * Best-effort anchor. Never throws.
   *
   * Logs failures at WARN level so they are visible in production logs
   * (silent failures were the cause of "no on-chain records" surprises).
   */
  async anchorSafe(type, entityId, payload, actorId = null, extra = {}) {
    try {
      const result = await this.anchor(type, entityId, payload, actorId, extra);
      logger.info(
        `[blockchainService] anchored ${type}:${entityId} txid=${result?.txid}`
      );
      return result;
    } catch (error) {
      logger.warn(
        `[blockchainService] anchor ${type}:${entityId} FAILED — ` +
        `DB write will still succeed. Reason: ${error.message}`
      );
      return null;
    }
  }


  // =========================================================================
  // PATIENT
  // =========================================================================

  _patientPayload(patient) {
    const raw = (key) => {
      if (patient && typeof patient.getDataValue === 'function') {
        return patient.getDataValue(key);
      }
      return patient?.[key];
    };

    const asDateOnly = (value) => {
      if (!value) return null;
      if (value instanceof Date) return value.toISOString().slice(0, 10);
      if (typeof value === 'string') return value.slice(0, 10);
      return String(value);
    };

    const asInt = (value) => {
      if (value === null || value === undefined) return null;
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    };

    return {
      id: asInt(raw('id')),
      patient_facility_code: raw('patient_facility_code'),

      status_ct: raw('status'),
      status_hash: raw('status_hash'),

      first_name_ct: raw('first_name'),
      first_name_hash: raw('first_name_hash'),

      middle_name_ct: raw('middle_name'),
      middle_name_hash: raw('middle_name_hash'),

      last_name_ct: raw('last_name'),
      last_name_hash: raw('last_name_hash'),

      birth_date_ct: raw('birth_date'),
      birth_date_hash: raw('birth_date_hash'),

      gender_ct: raw('gender'),
      gender_hash: raw('gender_hash'),

      contact_number_ct: raw('contact_number'),
      contact_number_hash: raw('contact_number_hash'),

      address_ct: raw('address'),

      emergency_contact_ct: raw('emergency_contact'),
      emergency_phone_ct: raw('emergency_phone'),
      emergency_phone_hash: raw('emergency_phone_hash'),

      guardian_name_ct: raw('guardian_name'),
      guardian_contact_ct: raw('guardian_contact'),

      user_id: asInt(raw('user_id')),

      enrollment_date: asDateOnly(raw('enrollment_date')),
      treatment_transition_date: asDateOnly(raw('treatment_transition_date'))
    };
  }


  async anchorPatientCreate(patient, actorId = null) {
    return this.anchorSafe(
      'patient.create',
      patient.id,
      this._patientPayload(patient),
      actorId,
      { code: patient.patient_facility_code }
    );
  }


  async anchorPatientUpdate(patient, actorId = null, changed = null) {
    return this.anchorSafe(
      'patient.update',
      patient.id,
      this._patientPayload(patient),
      actorId,
      changed
        ? { changed, code: patient.patient_facility_code }
        : { code: patient.patient_facility_code }
    );
  }


  async anchorPatientDelete(patient, actorId = null, hard = false) {
    return this.anchorSafe(
      hard ? 'patient.hard_delete' : 'patient.soft_delete',
      patient.id,
      this._patientPayload(patient),
      actorId,
      { code: patient.patient_facility_code }
    );
  }


  // =========================================================================
  // ENCOUNTERS
  // =========================================================================

  /**
   * Anchor an encounter event under the PATIENT id so it shows up in the
   * patient-scoped verification panel. The encounter's own id is preserved
   * in `extra.encounter_id`.
   *
   * FIX: previously anchored under `v.id` (encounter id), which meant the
   * frontend filter (entity_id === patientId) silently dropped every
   * encounter anchor.
   */
  async anchorEncounterCreate(kind, encounter, actorId = null) {
    const v = typeof encounter.get === 'function'
      ? encounter.get()
      : encounter;

    if (v.patient_id === undefined || v.patient_id === null) {
      logger.warn(
        `[blockchainService] anchorEncounterCreate(${kind}) skipped: ` +
        `missing patient_id on encounter id=${v.id}`
      );
      return null;
    }

    const payload = {
      id: v.id,
      patient_id: v.patient_id,
      encounter_date: v.encounter_date,
      created_at: v.created_at,
      updated_at: v.updated_at
    };

    return this.anchorSafe(`${kind}.create`, v.patient_id, payload, actorId, {
      encounter_id: v.id,
      patient_id: v.patient_id
    });
  }


  // =========================================================================
  // QUEUE
  // =========================================================================

  /**
   * Anchor a queue event under the PATIENT id so it shows up in the
   * patient-scoped verification panel. The queue entry's own id is preserved
   * in `extra.queue_entry_id`.
   *
   * FIX: previously anchored under `v.id` (queue entry id), which meant the
   * frontend filter (entity_id === patientId) silently dropped every queue
   * anchor.
   */
  async anchorQueueEvent(eventType, entry, actorId = null) {
    const v = typeof entry.get === 'function' ? entry.get() : entry;

    if (v.patient_id === undefined || v.patient_id === null) {
      logger.warn(
        `[blockchainService] anchorQueueEvent(${eventType}) skipped: ` +
        `missing patient_id on entry id=${v.id}`
      );
      return null;
    }

    const payload = {
      id: v.id,
      patient_id: v.patient_id,
      queue_id: v.queue_id,
      status: v.status,
      created_at: v.created_at,
      updated_at: v.updated_at
    };

    return this.anchorSafe(`queue.${eventType}`, v.patient_id, payload, actorId, {
      queue_entry_id: v.id,
      patient_id: v.patient_id
    });
  }


  // =========================================================================
  // READ RECENT ITEMS
  // =========================================================================

  /**
   * Return the most recent items in the stream.
   *
   * IMPORTANT: this returns RAW MultiChain items — `data` is a hex-encoded
   * JSON string, and the stream key lives in `keys` (an array), not `key`.
   * Consumers that need the decoded payload must call `decodeStreamPayload()`
   * (exported below) or use the flattened fields on the item.
   *
   * Do NOT change this to return normalized objects without updating every
   * caller — `verifyPatientAgainstChain()` in particular depends on `.data`
   * being present.
   */
  async listRecentItems(count = 20, verbose = true, actorId = null, req = null) {
    const safeCount = Math.min(Math.max(Number(count) || 20, 1), 2000);

    // Coerce to real boolean — MultiChain rejects string booleans for `verbose`
    const verboseBool =
      verbose === true ||
      verbose === 'true' ||
      verbose === 1 ||
      verbose === '1';

    const result = await mc.tryRun(
      ['liststreamitems', STREAM, verboseBool, safeCount],
      { json: true }
    );

    audit.write({
      userId: actorId,
      action: 'LIST',
      entityType: 'BlockchainItem',
      metadata: {
        stream: STREAM,
        count: safeCount,
        verbose: verboseBool,
        ok: result.ok
      },
      ipAddress: req?.ip,
      userAgent: req?.get?.('User-Agent')
    });

    if (!result.ok) {
      logger.warn(`[blockchainService] listRecentItems failed: ${result.error}`);
      return [];
    }

    return Array.isArray(result.data) ? result.data : [];
  }


  // =========================================================================
  // GET SINGLE ITEM
  // =========================================================================

  async getItem(txid, actorId = null, req = null) {
    if (!txid) return null;

    const result = await mc.tryRun(
      ['getstreamitem', STREAM, txid, true],   // boolean, not string
      { json: true }
    );

    if (!result.ok || !result.data) {
      logger.warn(
        `[blockchainService] getItem(${txid}) failed: ` +
        `${result.error || 'no data'}`
      );
      return null;
    }

    const item = result.data;
    const record = decodeStreamPayload(item);

    audit.write({
      userId: actorId,
      action: 'READ',
      entityType: 'BlockchainItem',
      entityId: txid,
      metadata: { stream: STREAM, key: item.key },
      ipAddress: req?.ip,
      userAgent: req?.get?.('User-Agent')
    });

    return {
      txid: item.txid || txid,
      key: item.key,
      record,
      blockhash: item.blockhash,
      blockindex: item.blockindex,
      blocktime: item.blocktime,
      confirmations: item.confirmations
    };
  }


  // =========================================================================
  // VERIFY TXID
  // =========================================================================

  async verify(txid, expectedPayload = null, actorId = null, req = null) {
    const item = await this.getItem(txid, actorId, req);

    if (!item) {
      // FIX: `matches: null` (not false) — "not found" is distinct from
      // "found but mismatched". Frontends rely on this distinction.
      return { txid, found: false, matches: null };
    }

    const onChainHash = item.record?.payload_hash || null;
    const expectedHash = expectedPayload
      ? mc.hashPayload(expectedPayload)
      : null;

    const matches =
      expectedHash && onChainHash
        ? expectedHash === onChainHash
        : null;

    audit.write({
      userId: actorId,
      action: 'VERIFY',
      entityType: 'BlockchainItem',
      entityId: txid,
      metadata: { matches, expectedHash, onChainHash },
      ipAddress: req?.ip,
      userAgent: req?.get?.('User-Agent')
    });

    return {
      txid,
      found: true,
      matches,
      expectedHash,
      onChainHash,
      record: item.record
    };
  }


  // =========================================================================
  // VERIFY PATIENT
  // =========================================================================

  /**
   * Rebuild the patient payload from the current DB row and compare its
   * hash against the newest patient.* anchor on the blockchain.
   *
   * NOTE: this method depends on `listRecentItems()` returning RAW items
   * with `.data` as a hex string. If you ever normalize that method,
   * update this one to match.
   */
  async verifyPatientAgainstChain(patientId, actorId = null, req = null) {
    const patient = await db.Patient.findByPk(patientId);

    if (!patient) {
      return {
        patientId,
        found: false,
        matches: null,
        reason: 'Patient not found'
      };
    }

    // Pull a generous slice so older creates are not missed.
    const items = await this.listRecentItems(2000, true, actorId, req);

    const anchors = (items || [])
      .map(raw => {
        const decoded = decodeStreamPayload(raw);
        if (!decoded) return null;
        return {
          txid: raw.txid,
          confirmations: raw.confirmations ?? 0,
          record: decoded
        };
      })
      .filter(item => {
        if (!item || !item.record) return false;
        // Match by entity_id OR by facility code (belt and braces)
        const idMatch =
          String(item.record.entity_id) === String(patientId);
        const codeMatch =
          item.record.code &&
          patient.patient_facility_code &&
          item.record.code === patient.patient_facility_code;
        return (idMatch || codeMatch) &&
               String(item.record.type || '').startsWith('patient.');
      })
      .sort((a, b) => new Date(b.record.ts) - new Date(a.record.ts));

    if (anchors.length === 0) {
      return {
        patientId,
        found: false,
        matches: null,
        reason: 'No on-chain anchor for this patient'
      };
    }

    const latest = anchors[0];
    const onChainHash = latest.record.payload_hash;

    const recomputedHash = mc.hashPayload(
      this._patientPayload(patient)
    );

    const matches = recomputedHash === onChainHash;

    audit.write({
      userId: actorId,
      action: 'VERIFY_PATIENT',
      entityType: 'BlockchainItem',
      entityId: null,
      metadata: {
        patientId,
        txid: latest.txid,
        onChainHash,
        recomputedHash,
        matches
      },
      ipAddress: req?.ip,
      userAgent: req?.get?.('User-Agent')
    });

    return {
      patientId,
      found: true,
      matches,
      onChainHash,
      recomputedHash,
      txid: latest.txid,
      confirmations: latest.confirmations,
      record: latest.record,
      reason: matches
        ? null
        : 'Payload hash mismatch — record has been modified'
    };
  }
}


// ===========================================================================
// Exports
// ===========================================================================

const instance = new BlockchainService();

// Attach the shared decoder so route handlers / other services can use it
// without duplicating the hex-decode logic.
instance.decodeStreamPayload = decodeStreamPayload;

module.exports = instance;
module.exports.decodeStreamPayload = decodeStreamPayload;