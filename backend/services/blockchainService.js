// backend/services/blockchainService.js
'use strict';

const db = require('../models');
const audit = require('../utils/audit');
const logger = require('../utils/logger');
const mc = require('../utils/multichainCli');
const blockchainConfig = require('../config/blockchain');

const STREAM = blockchainConfig.stream
  || process.env.BLOCKCHAIN_STREAM
  || 'patient_audit';

class BlockchainService {

  // -------------------------------------------------------------------------
  // Chain / stream status
  // -------------------------------------------------------------------------

  async getChainInfo(actorId = null, req = null) {
    const result = mc.tryRun(['getinfo'], { json: true });

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
    const result = mc.tryRun(['getstreaminfo', stream], { json: true });

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
    const info   = mc.tryRun(['getinfo'], { json: true });
    const stream = mc.tryRun(['getstreaminfo', STREAM], { json: true });

    audit.write({
      userId: actorId,
      action: 'STATUS',
      entityType: 'Blockchain',
      metadata: { chainOk: info.ok, streamOk: stream.ok },
      ipAddress: req?.ip,
      userAgent: req?.get?.('User-Agent')
    });

    if (!info.ok) {
      return {
        ok: false,
        chain: blockchainConfig.chain,
        rpc: `${blockchainConfig.host}:${blockchainConfig.rpcPort}`,
        stream: STREAM,
        error: info.error
      };
    }

    return {
      ok: true,
      chain: info.data.chainname,
      version: info.data.version,
      protocol: info.data.protocolversion,
      blocks: info.data.blocks,
      connections: info.data.connections,
      nodeaddress: info.data.nodeaddress,
      streams: info.data.streams,
      miningpaused: info.data.miningpaused,
      incomingpaused: info.data.incomingpaused,
      stream: STREAM,
      streamExists: stream.ok,
      streamRestrict: stream.ok ? stream.data.restrict : null
    };
  }

  // -------------------------------------------------------------------------
  // Anchoring
  // -------------------------------------------------------------------------

  /**
   * Publish a structured record. Throws on failure.
   * Prefer the domain-specific anchor* methods below.
   */
  async anchor(type, entityId, payload, actorId = null, extra = {}) {
    const record = {
      type,
      entity_id: entityId,
      actor_id: actorId,
      ts: new Date().toISOString(),
      payload_hash: mc.hashPayload(payload),
      ...extra
    };

    const hex = Buffer.from(JSON.stringify(record), 'utf8').toString('hex');
    const key = `${type}:${entityId}`;
    const txid = mc.run(['publish', STREAM, key, hex]);

    audit.write({
      userId: actorId,
      action: 'ANCHOR',
      entityType: 'BlockchainItem',
      entityId: `${key}`,
      metadata: { txid, payload_hash: record.payload_hash, stream: STREAM },
      ipAddress: null
    });

    return { txid, hash: record.payload_hash, record };
  }

  /**
   * Best-effort anchor. Never throws — logs and returns null.
   * Use this from business services so a chain hiccup never rolls back a DB write.
   */
  async anchorSafe(type, entityId, payload, actorId = null, extra = {}) {
    try {
      return await this.anchor(type, entityId, payload, actorId, extra);
    } catch (e) {
      logger.error(`[blockchainService] anchor ${type}:${entityId} failed: ${e.message}`);
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // Domain anchors
  // -------------------------------------------------------------------------

  /** Extract only ciphertext + hash columns from a Patient row. */
  _patientPayload(patient) {
  const raw = (k) => (patient.getDataValue ? patient.getDataValue(k) : patient[k]);

  const asDateOnly = (v) => {
    if (!v) return null;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (typeof v === 'string') return v.slice(0, 10);
    return String(v);
  };
  const asInt = (v) => (v === null || v === undefined ? null : Number(v));

  return {
    id:                         asInt(raw('id')),
    patient_facility_code:      raw('patient_facility_code'),
    status_ct:                  raw('status'),
    status_hash:                raw('status_hash'),
    first_name_ct:              raw('first_name'),
    first_name_hash:            raw('first_name_hash'),
    middle_name_ct:             raw('middle_name'),
    middle_name_hash:           raw('middle_name_hash'),
    last_name_ct:               raw('last_name'),
    last_name_hash:             raw('last_name_hash'),
    birth_date_ct:              raw('birth_date'),
    birth_date_hash:            raw('birth_date_hash'),
    gender_ct:                  raw('gender'),
    gender_hash:                raw('gender_hash'),
    contact_number_ct:          raw('contact_number'),
    contact_number_hash:        raw('contact_number_hash'),
    address_ct:                 raw('address'),
    emergency_contact_ct:       raw('emergency_contact'),
    emergency_phone_ct:         raw('emergency_phone'),
    emergency_phone_hash:       raw('emergency_phone_hash'),
    guardian_name_ct:           raw('guardian_name'),
    guardian_contact_ct:        raw('guardian_contact'),
    user_id:                    asInt(raw('user_id')),
    enrollment_date:            asDateOnly(raw('enrollment_date')),
    treatment_transition_date:  asDateOnly(raw('treatment_transition_date'))
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
      changed ? { changed } : {}
    );
  }

  async anchorPatientDelete(patient, actorId = null, hard = false) {
    return this.anchorSafe(
      hard ? 'patient.hard_delete' : 'patient.soft_delete',
      patient.id,
      this._patientPayload(patient),
      actorId
    );
  }

  async anchorEncounterCreate(kind, encounter, actorId = null) {
    // kind: 'testing' | 'treatment'
    const v = encounter.get ? encounter.get() : encounter;
    const payload = {
      id: v.id,
      patient_id: v.patient_id,
      encounter_date: v.encounter_date,
      created_at: v.created_at,
      updated_at: v.updated_at
    };
    return this.anchorSafe(`${kind}.create`, v.id, payload, actorId);
  }

  async anchorQueueEvent(eventType, entry, actorId = null) {
    const v = entry.get ? entry.get() : entry;
    const payload = {
      id: v.id,
      patient_id: v.patient_id,
      queue_id: v.queue_id,
      status: v.status,
      created_at: v.created_at,
      updated_at: v.updated_at
    };
    return this.anchorSafe(`queue.${eventType}`, v.id, payload, actorId);
  }
  

  // inside class BlockchainService

/**
 * Rebuild the patient payload from the *current* DB row and compare to the
 * on-chain payload_hash. Detects any out-of-band mutation.
 *
 * @param {number} patientId
 * @returns {{
 *   patientId, found, matches, onChainHash, recomputedHash, record, reason
 * }}
 */
async verifyPatientAgainstChain(patientId, actorId = null, req = null) {
  // 1. Fetch the current patient
  const patient = await db.Patient.findByPk(patientId);
  if (!patient) {
    return { patientId, found: false, matches: false, reason: 'Patient not found' };
  }

  // 2. Find the newest patient.* anchor for this patient
  const items = await this.listRecentItems(500, true, actorId, req);
  const anchors = (items || [])
    .map(raw => {
      let decoded = null;
      try {
        const hex = raw.data;
        decoded = JSON.parse(Buffer.from(hex, 'hex').toString('utf8'));
      } catch { /* ignore */ }
      return decoded ? {
        txid: raw.txid,
        confirmations: raw.confirmations ?? 0,
        record: decoded
      } : null;
    })
    .filter(x => x && x.record && x.record.entity_id === patientId)
    .filter(x => String(x.record.type || '').startsWith('patient.'))
    .sort((a, b) => new Date(b.record.ts) - new Date(a.record.ts));

  if (anchors.length === 0) {
    return {
      patientId, found: false, matches: false,
      reason: 'No on-chain anchor for this patient'
    };
  }

  const latest = anchors[0];
  const onChainHash = latest.record.payload_hash;

  // 3. Rebuild the payload from the current DB row using the SAME shape as
  //    anchorPatientCreate.
  const recomputedHash = mc.hashPayload(this._patientPayload(patient));

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
    record: latest.record,
    reason: matches ? null : 'Payload hash mismatch — record has been modified'
  };
}
  // -------------------------------------------------------------------------
  // Reading / verification
  // -------------------------------------------------------------------------

  async listRecentItems(count = 20, verbose = false, actorId = null, req = null) {
    const result = mc.tryRun(
      ['liststreamitems', STREAM, String(verbose), String(count)],
      { json: true }
    );

    audit.write({
      userId: actorId,
      action: 'LIST',
      entityType: 'BlockchainItem',
      metadata: { stream: STREAM, count, ok: result.ok },
      ipAddress: req?.ip,
      userAgent: req?.get?.('User-Agent')
    });

    return result.ok ? result.data : [];
  }

  async getItem(txid, actorId = null, req = null) {
    const result = mc.tryRun(['getstreamitem', STREAM, txid, 'true'], { json: true });
    if (!result.ok || !result.data) return null;

    const item = result.data;
    let record = null;
    try {
      record = JSON.parse(Buffer.from(item.data, 'hex').toString('utf8'));
    } catch {
      record = null;
    }

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

  /**
   * Verify that an on-chain item's payload_hash matches the given payload.
   * @returns {{ txid, found, matches, expectedHash, onChainHash, record }}
   */
  async verify(txid, expectedPayload = null, actorId = null, req = null) {
    const item = await this.getItem(txid);
    if (!item) {
      return { txid, found: false, matches: false };
    }

    const onChainHash = item.record?.payload_hash || null;
    const expectedHash = expectedPayload ? mc.hashPayload(expectedPayload) : null;
    const matches = expectedHash && onChainHash ? expectedHash === onChainHash : null;

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
}

module.exports = new BlockchainService();