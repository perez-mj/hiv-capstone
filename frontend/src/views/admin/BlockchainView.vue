<!-- frontend/src/views/admin/BlockchainView.vue -->
<template>
  <v-container fluid class="pa-4 blockchain-view">
    <v-row>
      <v-col cols="12">
        <!-- ─────────────────────────────────────────────
             Header
        ───────────────────────────────────────────── -->
        <v-card variant="flat" class="header-card mb-4">
          <v-card-text class="d-flex align-center flex-wrap ga-4 pa-4">
            <div class="flex-grow-1 d-flex align-center">
              <v-icon size="28" color="primary" class="mr-3">mdi-link-chain</v-icon>
              <div>
                <h2 class="text-h6 font-weight-bold mb-1">Blockchain Verification</h2>
                <p class="text-caption text-medium-emphasis mb-0">
                  Chain status, on-chain anchors, and integrity checks
                </p>
              </div>
            </div>
            <div class="d-flex ga-2 align-center flex-wrap">
              <v-btn
                color="secondary"
                variant="tonal"
                class="text-none"
                prepend-icon="mdi-refresh"
                :loading="loadingStats"
                @click="refreshAll"
              >
                Refresh
              </v-btn>
              <v-btn
                color="primary"
                variant="flat"
                class="text-none"
                prepend-icon="mdi-shield-search"
                :loading="scanning"
                @click="scanRecentActivity"
              >
                Scan Recent Activity
              </v-btn>
            </div>
          </v-card-text>
        </v-card>

        <!-- ─────────────────────────────────────────────
             Chain status cards
        ───────────────────────────────────────────── -->
        <v-row dense class="mb-4">
          <v-col cols="12" sm="6" md="3">
            <v-card variant="flat" class="stat-card">
              <v-card-text class="pa-4 text-center">
                <v-icon size="32" color="primary">mdi-cube-outline</v-icon>
                <div class="text-h4 mt-2 font-weight-bold">{{ status.blocks ?? '—' }}</div>
                <div class="text-caption text-medium-emphasis">Blocks</div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-card variant="flat" class="stat-card">
              <v-card-text class="pa-4 text-center">
                <v-icon
                  size="32"
                  :color="status.ok ? 'success' : 'error'"
                >
                  {{ status.ok ? 'mdi-shield-check' : 'mdi-shield-alert-outline' }}
                </v-icon>
                <div
                  class="text-h5 mt-2 font-weight-bold"
                  :class="status.ok ? 'text-success' : 'text-error'"
                >
                  {{ status.ok ? 'Online' : 'Offline' }}
                </div>
                <div class="text-caption text-medium-emphasis">Chain Status</div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-card variant="flat" class="stat-card">
              <v-card-text class="pa-4 text-center">
                <v-icon size="32" color="info">mdi-transit-connection-variant</v-icon>
                <div class="text-h4 mt-2 font-weight-bold">{{ status.connections ?? '—' }}</div>
                <div class="text-caption text-medium-emphasis">Peers</div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-card variant="flat" class="stat-card">
              <v-card-text class="pa-4 text-center">
                <v-icon
                  size="32"
                  :color="status.streamExists ? 'success' : 'warning'"
                >
                  mdi-database
                </v-icon>
                <div
                  class="text-h5 mt-2 font-weight-bold"
                  :class="status.streamExists ? 'text-success' : 'text-warning'"
                >
                  {{ status.streamExists ? 'Ready' : 'Missing' }}
                </div>
                <div class="text-caption text-medium-emphasis text-truncate">
                  Stream · {{ status.stream || '—' }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- ─────────────────────────────────────────────
             Chain metadata
        ───────────────────────────────────────────── -->
        <v-card variant="flat" class="info-card mb-4">
          <v-card-title class="text-subtitle-1 font-weight-bold">Chain Info</v-card-title>
          <v-divider />
          <v-card-text>
            <v-row dense>
              <v-col cols="12" sm="6" md="4">
                <div class="text-caption text-medium-emphasis">Chain</div>
                <div class="text-body-2 font-weight-medium">{{ status.chain || '—' }}</div>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <div class="text-caption text-medium-emphasis">Version</div>
                <div class="text-body-2">{{ status.version || '—' }}</div>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <div class="text-caption text-medium-emphasis">Protocol</div>
                <div class="text-body-2">{{ status.protocol || '—' }}</div>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <div class="text-caption text-medium-emphasis">Node Address</div>
                <div class="text-body-2 text-truncate">{{ status.nodeaddress || '—' }}</div>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <div class="text-caption text-medium-emphasis">RPC</div>
                <div class="text-body-2 text-truncate">{{ status.rpc || '—' }}</div>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <div class="text-caption text-medium-emphasis">Stream Restrict</div>
                <div>
                  <v-chip
                    v-if="status.streamRestrict"
                    size="small"
                    :color="status.streamRestrict.write ? 'success' : 'warning'"
                    variant="tonal"
                  >
                    write={{ status.streamRestrict.write }} · read={{ status.streamRestrict.read }}
                  </v-chip>
                  <span v-else class="text-medium-emphasis">—</span>
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- ─────────────────────────────────────────────
             Verify single item by txid
        ───────────────────────────────────────────── -->
        <v-card variant="flat" class="info-card mb-4">
          <v-card-title class="text-subtitle-1 font-weight-bold">
            Verify Single Item by TxID
          </v-card-title>
          <v-divider />
          <v-card-text class="pt-4">
            <v-row>
              <v-col cols="12" md="9">
                <v-text-field
                  v-model="verifyForm.txid"
                  label="Transaction ID (txid)"
                  placeholder="e.g. bc373bd8b1293d11…"
                  prepend-inner-icon="mdi-pound"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  clearable
                  @update:model-value="verificationResult = null"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-btn
                  color="primary"
                  variant="flat"
                  class="text-none w-100"
                  prepend-icon="mdi-check-decagram"
                  :loading="verifying"
                  :disabled="!verifyForm.txid"
                  @click="verifyRecord"
                >
                  Verify
                </v-btn>
              </v-col>
            </v-row>

            <v-expand-transition>
              <div v-if="verificationResult" class="mt-4">
                <v-card variant="outlined">
                  <v-card-title class="d-flex align-center">
                    <v-icon class="mr-2" :color="resultColor">
                      {{ resultIcon }}
                    </v-icon>
                    Verification Result
                    <v-spacer />
                    <v-chip :color="resultColor" size="small" variant="flat">
                      {{ resultLabel }}
                    </v-chip>
                  </v-card-title>
                  <v-divider />
                  <v-card-text>
                    <v-list density="compact" class="bg-transparent">
                      <v-list-item>
                        <v-list-item-title class="font-weight-bold">TxID</v-list-item-title>
                        <v-list-item-subtitle class="text-caption text-wrap">
                          {{ verificationResult.txid }}
                        </v-list-item-subtitle>
                      </v-list-item>

                      <v-list-item v-if="verificationResult.record">
                        <v-list-item-title class="font-weight-bold">Type</v-list-item-title>
                        <v-list-item-subtitle class="text-caption">
                          {{ verificationResult.record.type || '—' }}
                          <template v-if="verificationResult.record.entity_id != null">
                            · entity #{{ verificationResult.record.entity_id }}
                          </template>
                        </v-list-item-subtitle>
                      </v-list-item>

                      <v-list-item v-if="verificationResult.onChainHash">
                        <v-list-item-title class="font-weight-bold">On-chain Hash</v-list-item-title>
                        <v-list-item-subtitle class="text-caption text-wrap">
                          <code>{{ verificationResult.onChainHash }}</code>
                        </v-list-item-subtitle>
                      </v-list-item>

                      <v-list-item v-if="verificationResult.expectedHash">
                        <v-list-item-title class="font-weight-bold">Expected Hash</v-list-item-title>
                        <v-list-item-subtitle class="text-caption text-wrap">
                          <code>{{ verificationResult.expectedHash }}</code>
                        </v-list-item-subtitle>
                      </v-list-item>

                      <v-list-item v-if="verificationResult.recomputedHash">
                        <v-list-item-title class="font-weight-bold">Recomputed Hash</v-list-item-title>
                        <v-list-item-subtitle class="text-caption text-wrap">
                          <code>{{ verificationResult.recomputedHash }}</code>
                        </v-list-item-subtitle>
                      </v-list-item>
                    </v-list>
                  </v-card-text>
                </v-card>
              </div>
            </v-expand-transition>
          </v-card-text>
        </v-card>

        <!-- ─────────────────────────────────────────────
             Recent activity
        ───────────────────────────────────────────── -->
        <v-card variant="flat" class="table-card mb-4">
          <v-card-title class="d-flex align-center">
            <span class="text-subtitle-1 font-weight-bold">Recent On-chain Activity</span>
            <v-spacer />
            <v-btn
              size="small"
              variant="text"
              class="text-none"
              prepend-icon="mdi-refresh"
              :loading="loadingItems"
              @click="loadRecentItems"
            >
              Reload
            </v-btn>
          </v-card-title>
          <v-divider />
          <v-data-table
            :headers="itemHeaders"
            :items="recentItems"
            :loading="loadingItems"
            item-value="txid"
            class="modern-table"
          >
            <template #item.txid="{ item }">
              <span class="text-caption font-monospace">{{ truncateHash(item.txid) }}</span>
            </template>

            <template #item.type="{ item }">
              <v-chip
                size="small"
                variant="tonal"
                color="primary"
                class="text-capitalize"
              >
                {{ item.type || '—' }}
              </v-chip>
            </template>

            <template #item.entityId="{ item }">
              <span class="text-body-2">{{ item.entityId ?? '—' }}</span>
            </template>

            <template #item.ts="{ item }">
              <span class="text-caption">{{ formatTime(item.ts) }}</span>
            </template>

            <template #item.payloadHash="{ item }">
              <span class="text-caption font-monospace">{{ truncateHash(item.payloadHash) }}</span>
            </template>

            <template #item.confirmations="{ item }">
              <v-chip
                size="small"
                :color="item.confirmations > 0 ? 'success' : 'warning'"
                variant="tonal"
              >
                {{ item.confirmations }}
              </v-chip>
            </template>

            <template #item.actions="{ item }">
              <v-btn
                size="small"
                variant="text"
                color="primary"
                class="text-none"
                :disabled="verifying"
                @click="verifyByTxid(item.txid)"
              >
                Verify
              </v-btn>
            </template>

            <template #no-data>
              <div class="empty-state">
                <v-icon size="48" color="grey-lighten-1">mdi-cube-off-outline</v-icon>
                <p class="text-body-2 text-medium-emphasis mt-3 mb-0">
                  No items have been anchored yet.
                </p>
              </div>
            </template>

            <template #bottom>
              <div class="table-footer">
                <span class="text-caption text-medium-emphasis">
                  Showing <strong>{{ recentItems.length }}</strong> recent anchors
                </span>
              </div>
            </template>
          </v-data-table>
        </v-card>

        <!-- ─────────────────────────────────────────────
             Scan results
        ───────────────────────────────────────────── -->
        <v-card v-if="scanResult" variant="flat" class="info-card">
          <v-card-title class="text-subtitle-1 font-weight-bold">Scan Result</v-card-title>
          <v-divider />
          <v-card-text class="pt-4">
            <v-alert
              :type="scanResult.mismatches.length === 0 ? 'success' : 'error'"
              variant="tonal"
              class="mb-3"
            >
              <template v-if="scanResult.mismatches.length === 0">
                Scanned <strong>{{ scanResult.scanned }}</strong> item(s). All payload hashes match.
              </template>
              <template v-else>
                Scanned <strong>{{ scanResult.scanned }}</strong> item(s).
                <strong>{{ scanResult.mismatches.length }}</strong> mismatch(es) found.
              </template>
            </v-alert>

            <v-data-table
              v-if="scanResult.mismatches.length"
              :headers="mismatchHeaders"
              :items="scanResult.mismatches"
              class="modern-table"
            >
              <template #item.txid="{ item }">
                <span class="text-caption font-monospace">{{ truncateHash(item.txid) }}</span>
              </template>
              <template #item.onChainHash="{ item }">
                <span class="text-caption font-monospace">{{ truncateHash(item.onChainHash) }}</span>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Snackbar -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3500"
      location="top"
      rounded="lg"
    >
      <div class="d-flex align-center">
        <v-icon class="mr-2">
          {{ snackbar.color === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle' }}
        </v-icon>
        {{ snackbar.message }}
      </div>
      <template #actions>
        <v-btn icon="mdi-close" variant="text" size="small" @click="snackbar.show = false" />
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/plugins/axios'

/* ─────────────── State ─────────────── */
const loadingStats = ref(false)
const loadingItems = ref(false)
const verifying = ref(false)
const scanning = ref(false)

const status = ref({
  ok: false,
  chain: null,
  version: null,
  protocol: null,
  blocks: null,
  connections: null,
  nodeaddress: null,
  rpc: null,
  stream: null,
  streamExists: false,
  streamRestrict: null,
})

const recentItems = ref([])
const verificationResult = ref(null)
const verifyForm = ref({ txid: '' })
const scanResult = ref(null)

const snackbar = ref({ show: false, message: '', color: 'success' })

/* ─────────────── Table headers ─────────────── */
const itemHeaders = [
  { title: 'TxID', key: 'txid', sortable: false },
  { title: 'Type', key: 'type', sortable: true },
  { title: 'Entity', key: 'entityId', sortable: true },
  { title: 'Timestamp', key: 'ts', sortable: true },
  { title: 'Payload Hash', key: 'payloadHash', sortable: false },
  { title: 'Confs', key: 'confirmations', sortable: true, align: 'center', width: '90px' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
]

const mismatchHeaders = [
  { title: 'TxID', key: 'txid', sortable: false },
  { title: 'Type', key: 'type', sortable: true },
  { title: 'Entity', key: 'entityId', sortable: true },
  { title: 'On-chain Hash', key: 'onChainHash', sortable: false },
  { title: 'Reason', key: 'reason', sortable: false },
]

/* ─────────────── Verification card state ─────────────── */
const resultColor = computed(() => {
  const r = verificationResult.value
  if (!r) return 'grey'
  if (r.matches === false) return 'error'
  if (r.matches === true) return 'success'
  return 'info'
})

const resultIcon = computed(() => {
  const r = verificationResult.value
  if (!r) return 'mdi-help-circle-outline'
  if (r.matches === false) return 'mdi-alert-octagon-outline'
  if (r.matches === true) return 'mdi-check-decagram'
  return 'mdi-information-outline'
})

const resultLabel = computed(() => {
  const r = verificationResult.value
  if (!r) return 'UNKNOWN'
  if (r.matches === false) return 'MISMATCH'
  if (r.matches === true) return 'VERIFIED'
  return 'FOUND'
})

/* ─────────────── Helpers ─────────────── */
const truncateHash = (hash) => {
  if (!hash || typeof hash !== 'string') return 'N/A'
  if (hash.length <= 24) return hash
  return `${hash.slice(0, 16)}…${hash.slice(-8)}`
}

const formatTime = (iso) => {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()
  } catch {
    return iso
  }
}

const showSnackbar = (message, color = 'success') => {
  snackbar.value = { show: true, message, color }
}

/**
 * Decode a MultiChain stream item's `data` field into our anchor JSON.
 * Returns null for anything that isn't a JSON object.
 */
const decodeStreamItem = (raw) => {
  if (!raw) return null
  const { data } = raw

  if (data && typeof data === 'object') return data
  if (typeof data !== 'string' || data.length === 0) return null
  if (data.length % 2 !== 0) return null
  if (!/^[0-9a-f]+$/i.test(data)) return null

  let text
  try {
    const bytes = new Uint8Array(data.length / 2)
    for (let i = 0; i < data.length; i += 2) {
      bytes[i / 2] = parseInt(data.slice(i, i + 2), 16)
    }
    text = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
  } catch {
    return null
  }

  const trimmed = text.trimStart()
  if (!trimmed.startsWith('{')) return null

  try {
    const parsed = JSON.parse(trimmed)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

/**
 * Compute confirmations for a stream item.
 * MultiChain stream items carry `blockheight`; current tip is `status.blocks`.
 */
const confirmationsFor = (raw) => {
  if (typeof raw.confirmations === 'number') return raw.confirmations
  if (
    typeof raw.blockheight === 'number' &&
    typeof status.value.blocks === 'number'
  ) {
    return Math.max(0, status.value.blocks - raw.blockheight + 1)
  }
  return 0
}

/* ─────────────── Load ─────────────── */
async function loadStatus() {
  loadingStats.value = true
  try {
    const { data } = await api.get('/blockchain/status')
    // Strip null/undefined keys so we don't overwrite valid values
    const cleaned = Object.fromEntries(
      Object.entries(data || {}).filter(([, v]) => v !== null && v !== undefined)
    )
    status.value = { ...status.value, ...cleaned }
  } catch {
    showSnackbar('Failed to load chain status', 'error')
  } finally {
    loadingStats.value = false
  }
}

async function loadRecentItems() {
  loadingItems.value = true
  try {
    const { data } = await api.get('/blockchain/items', {
      params: { count: 20, verbose: true },
    })

    const list = Array.isArray(data)
      ? data
      : data?.items || data?.data || data?.result || []

    recentItems.value = list
      .map((raw) => {
        const decoded = decodeStreamItem(raw)
        if (!decoded) return null
        return {
          txid: raw.txid,
          key: raw.key ?? raw.keys?.[0] ?? null,
          type: decoded.type || null,
          entityId: decoded.entity_id ?? null,
          ts:
            decoded.ts ||
            (raw.blocktime
              ? new Date(raw.blocktime * 1000).toISOString()
              : null),
          payloadHash: decoded.payload_hash || null,
          actorId: decoded.actor_id ?? null,
          confirmations: confirmationsFor(raw),
          _raw: raw,
        }
      })
      .filter(Boolean)
  } catch {
    showSnackbar('Failed to load recent items', 'error')
    recentItems.value = []
  } finally {
    loadingItems.value = false
  }
}

async function refreshAll() {
  await Promise.all([loadStatus(), loadRecentItems()])
}

/* ─────────────── Verify ─────────────── */
async function verifyRecord() {
  if (!verifyForm.value.txid) return
  verifying.value = true
  verificationResult.value = null
  try {
    const { data } = await api.get(`/blockchain/verify/${verifyForm.value.txid}`)

    if (data?.found === false) {
      showSnackbar('TxID not found on chain', 'warning')
      return
    }

    verificationResult.value = data

    if (data.matches === false) {
      showSnackbar('Hash mismatch — record may have been tampered with', 'error')
    } else if (data.matches === true) {
      showSnackbar('Verified against blockchain', 'success')
    } else {
      showSnackbar('Fetched on-chain record (no expected hash to compare)', 'info')
    }
  } catch (e) {
    if (e?.response?.status === 404) {
      verificationResult.value = null
      showSnackbar('TxID not found on chain', 'warning')
    } else {
      showSnackbar('Verification failed', 'error')
    }
  } finally {
    verifying.value = false
  }
}

function verifyByTxid(txid) {
  verifyForm.value.txid = txid
  verifyRecord()
}

/* ─────────────── Scan ─────────────── */
/**
 * Scan recent anchors and verify each one against the backend.
 *
 * Previously this function only checked the *shape* of `payload_hash` — it
 * never compared against the recomputed hash, so it couldn't detect tampered
 * records. Now it calls the verify endpoint per item (bounded by the fetched
 * page size) and reports real mismatches.
 */
async function scanRecentActivity() {
  scanning.value = true
  scanResult.value = null
  try {
    const { data } = await api.get('/blockchain/items', {
      params: { count: 50, verbose: true },
    })

    const list = Array.isArray(data)
      ? data
      : data?.items || data?.data || data?.result || []

    const mismatches = []
    let scanned = 0

    for (const raw of list) {
      const decoded = decodeStreamItem(raw)
      if (!decoded) continue
      scanned++

      if (!decoded.payload_hash || !/^[0-9a-f]{64}$/i.test(decoded.payload_hash)) {
        mismatches.push({
          txid: raw.txid,
          type: decoded.type || null,
          entityId: decoded.entity_id ?? null,
          onChainHash: decoded.payload_hash || null,
          reason: 'Missing or malformed payload_hash',
        })
        continue
      }

      // Ask the backend to verify this specific txid
      try {
        const { data: v } = await api.get(`/blockchain/verify/${raw.txid}`)
        if (v?.matches === false) {
          mismatches.push({
            txid: raw.txid,
            type: decoded.type || null,
            entityId: decoded.entity_id ?? null,
            onChainHash: decoded.payload_hash || null,
            reason: 'Recomputed hash does not match on-chain hash',
          })
        }
      } catch (e) {
        mismatches.push({
          txid: raw.txid,
          type: decoded.type || null,
          entityId: decoded.entity_id ?? null,
          onChainHash: decoded.payload_hash || null,
          reason:
            e?.response?.status === 404
              ? 'TxID not found on chain'
              : 'Verification request failed',
        })
      }
    }

    scanResult.value = { scanned, mismatches }
    showSnackbar(
      mismatches.length === 0
        ? `Scan complete. ${scanned} anchor(s) verified OK.`
        : `Scan complete. ${mismatches.length} issue(s) found.`,
      mismatches.length === 0 ? 'success' : 'warning'
    )
  } catch {
    showSnackbar('Scan failed', 'error')
  } finally {
    scanning.value = false
  }
}

/* ─────────────── Lifecycle ─────────────── */
onMounted(refreshAll)
</script>

<style scoped>
.blockchain-view {
  max-width: 1400px;
  margin: 0 auto;
}

/* ─── Cards ─── */
.header-card,
.info-card,
.table-card,
.stat-card {
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
}

/* ─── Table ─── */
.modern-table :deep(thead th) {
  font-weight: 600 !important;
  text-transform: uppercase;
  font-size: 0.72rem !important;
  letter-spacing: 0.5px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06) !important;
}

.modern-table :deep(tbody tr) {
  transition: background 0.15s ease;
}

.modern-table :deep(tbody td) {
  padding-top: 12px !important;
  padding-bottom: 12px !important;
}

/* ─── Table footer ─── */
.table-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 12px 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

/* ─── Empty state ─── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 16px;
}

/* ─── Monospace helper ─── */
.font-monospace {
  font-family: 'Roboto Mono', 'Courier New', monospace;
  letter-spacing: 0.2px;
}
</style>