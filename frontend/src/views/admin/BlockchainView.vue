<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex justify-space-between align-center flex-wrap ga-2">
            <div class="d-flex align-center">
              <v-icon class="mr-2">mdi-link-chain</v-icon>
              Blockchain Verification
            </div>
            <div class="d-flex ga-2">
              <v-btn color="secondary" variant="tonal" :loading="loadingStats" @click="loadStatus">
                <v-icon left>mdi-refresh</v-icon>
                Refresh
              </v-btn>
              <v-btn color="primary" :loading="scanning" @click="scanRecentActivity">
                <v-icon left>mdi-shield-search</v-icon>
                Scan Recent Activity
              </v-btn>
            </div>
          </v-card-title>

          <v-divider />

          <v-card-text>
            <!-- Chain status -->
            <v-row>
              <v-col cols="12" sm="6" md="3">
                <v-card color="primary" theme="dark" class="text-center pa-4">
                  <v-icon size="32">mdi-cube-outline</v-icon>
                  <div class="text-h4 mt-2">{{ status.blocks ?? '—' }}</div>
                  <div class="text-caption">Blocks</div>
                </v-card>
              </v-col>

              <v-col cols="12" sm="6" md="3">
                <v-card
                  :color="status.ok ? 'success' : 'error'"
                  theme="dark"
                  class="text-center pa-4"
                >
                  <v-icon size="32">mdi-shield-check</v-icon>
                  <div class="text-h5 mt-2">
                    {{ status.ok ? 'Online' : 'Offline' }}
                  </div>
                  <div class="text-caption">Chain Status</div>
                </v-card>
              </v-col>

              <v-col cols="12" sm="6" md="3">
                <v-card color="info" theme="dark" class="text-center pa-4">
                  <v-icon size="32">mdi-transit-connection-variant</v-icon>
                  <div class="text-h4 mt-2">{{ status.connections ?? '—' }}</div>
                  <div class="text-caption">Peers</div>
                </v-card>
              </v-col>

              <v-col cols="12" sm="6" md="3">
                <v-card
                  :color="status.streamExists ? 'success' : 'warning'"
                  theme="dark"
                  class="text-center pa-4"
                >
                  <v-icon size="32">mdi-database</v-icon>
                  <div class="text-h5 mt-2">
                    {{ status.streamExists ? 'Ready' : 'Missing' }}
                  </div>
                  <div class="text-caption">Stream · {{ status.stream || '—' }}</div>
                </v-card>
              </v-col>
            </v-row>

            <!-- Chain metadata -->
            <v-row class="mt-4">
              <v-col cols="12">
                <v-card variant="outlined">
                  <v-card-title class="text-subtitle-1">Chain Info</v-card-title>
                  <v-card-text>
                    <v-row dense>
                      <v-col cols="12" sm="6" md="4">
                        <div class="text-caption text-medium-emphasis">Chain</div>
                        <div>{{ status.chain || '—' }}</div>
                      </v-col>
                      <v-col cols="12" sm="6" md="4">
                        <div class="text-caption text-medium-emphasis">Version</div>
                        <div>{{ status.version || '—' }}</div>
                      </v-col>
                      <v-col cols="12" sm="6" md="4">
                        <div class="text-caption text-medium-emphasis">Protocol</div>
                        <div>{{ status.protocol || '—' }}</div>
                      </v-col>
                      <v-col cols="12" sm="6" md="4">
                        <div class="text-caption text-medium-emphasis">Node Address</div>
                        <div class="text-truncate">{{ status.nodeaddress || '—' }}</div>
                      </v-col>
                      <v-col cols="12" sm="6" md="4">
                        <div class="text-caption text-medium-emphasis">RPC</div>
                        <div>{{ status.rpc || '—' }}</div>
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
              </v-col>
            </v-row>

            <!-- Verify single record by txid -->
            <v-row class="mt-4">
              <v-col cols="12">
                <v-card variant="outlined">
                  <v-card-title class="text-subtitle-1">Verify Single Item by TxID</v-card-title>
                  <v-card-text>
                    <v-row>
                      <v-col cols="12" md="8">
                        <v-text-field
                          v-model="verifyForm.txid"
                          label="Transaction ID (txid)"
                          placeholder="e.g. bc373bd8b1293d11..."
                          prepend-inner-icon="mdi-pound"
                          variant="outlined"
                          density="comfortable"
                          hide-details="auto"
                        />
                      </v-col>
                      <v-col cols="12" md="4">
                        <v-btn
                          color="primary"
                          block
                          :loading="verifying"
                          :disabled="!verifyForm.txid"
                          @click="verifyRecord"
                        >
                          <v-icon left>mdi-check-decagram</v-icon>
                          Verify
                        </v-btn>
                      </v-col>
                    </v-row>

                    <v-expand-transition>
                      <v-card
                        v-if="verificationResult"
                        class="mt-4"
                        variant="outlined"
                      >
                        <v-card-title class="d-flex align-center">
                          Verification Result
                          <v-chip
                            :color="verificationResult.matches === false ? 'error' : 'success'"
                            class="ml-2"
                            size="small"
                          >
                            {{ verificationResult.matches === false ? 'MISMATCH' : 'FOUND' }}
                          </v-chip>
                        </v-card-title>
                        <v-card-text>
                          <v-list density="compact">
                            <v-list-item>
                              <v-list-item-title class="font-weight-bold">TxID</v-list-item-title>
                              <v-list-item-subtitle class="text-caption text-wrap">
                                {{ verificationResult.txid }}
                              </v-list-item-subtitle>
                            </v-list-item>
                            <v-list-item v-if="verificationResult.record">
                              <v-list-item-title class="font-weight-bold">Type</v-list-item-title>
                              <v-list-item-subtitle class="text-caption">
                                {{ verificationResult.record.type }}
                                · entity #{{ verificationResult.record.entity_id }}
                              </v-list-item-subtitle>
                            </v-list-item>
                            <v-list-item v-if="verificationResult.onChainHash">
                              <v-list-item-title class="font-weight-bold">On-chain Hash</v-list-item-title>
                              <v-list-item-subtitle class="text-caption text-wrap">
                                {{ verificationResult.onChainHash }}
                              </v-list-item-subtitle>
                            </v-list-item>
                            <v-list-item v-if="verificationResult.expectedHash">
                              <v-list-item-title class="font-weight-bold">Expected Hash</v-list-item-title>
                              <v-list-item-subtitle class="text-caption text-wrap">
                                {{ verificationResult.expectedHash }}
                              </v-list-item-subtitle>
                            </v-list-item>
                          </v-list>
                        </v-card-text>
                      </v-card>
                    </v-expand-transition>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <!-- Recent activity -->
            <v-row class="mt-4">
              <v-col cols="12">
                <v-card variant="outlined">
                  <v-card-title class="d-flex align-center">
                    Recent On-chain Activity
                    <v-spacer />
                    <v-btn
                      size="small"
                      variant="text"
                      :loading="loadingItems"
                      @click="loadRecentItems"
                    >
                      <v-icon left size="18">mdi-refresh</v-icon>
                      Reload
                    </v-btn>
                  </v-card-title>
                  <v-card-text>
                    <v-data-table
                      :headers="itemHeaders"
                      :items="recentItems"
                      :loading="loadingItems"
                      item-value="txid"
                      density="comfortable"
                      class="elevation-0"
                      no-data-text="No items have been anchored yet."
                    >
                      <template #item.txid="{ item }">
                        <span class="text-caption">{{ truncateHash(item.txid) }}</span>
                      </template>
                      <template #item.type="{ item }">
                        <v-chip size="small" variant="tonal" color="primary">
                          {{ item.type || '—' }}
                        </v-chip>
                      </template>
                      <template #item.entityId="{ item }">
                        <span>{{ item.entityId ?? '—' }}</span>
                      </template>
                      <template #item.ts="{ item }">
                        <span class="text-caption">{{ formatTime(item.ts) }}</span>
                      </template>
                      <template #item.payloadHash="{ item }">
                        <span class="text-caption">{{ truncateHash(item.payloadHash) }}</span>
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
                          @click="verifyByTxid(item.txid)"
                        >
                          Verify
                        </v-btn>
                      </template>
                    </v-data-table>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <!-- Scan results -->
            <v-row v-if="scanResult" class="mt-4">
              <v-col cols="12">
                <v-card variant="outlined">
                  <v-card-title>Scan Result</v-card-title>
                  <v-card-text>
                    <v-alert
                      :type="scanResult.mismatches.length === 0 ? 'success' : 'error'"
                      variant="tonal"
                    >
                      <div v-if="scanResult.mismatches.length === 0">
                        Scanned {{ scanResult.scanned }} item(s). All payload hashes match.
                      </div>
                      <div v-else>
                        Scanned {{ scanResult.scanned }} item(s). {{ scanResult.mismatches.length }} mismatch(es) found.
                      </div>
                    </v-alert>

                    <v-data-table
                      v-if="scanResult.mismatches.length"
                      class="mt-3"
                      :headers="mismatchHeaders"
                      :items="scanResult.mismatches"
                      density="comfortable"
                    >
                      <template #item.txid="{ item }">
                        <span class="text-caption">{{ truncateHash(item.txid) }}</span>
                      </template>
                      <template #item.onChainHash="{ item }">
                        <span class="text-caption">{{ truncateHash(item.onChainHash) }}</span>
                      </template>
                    </v-data-table>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '@/plugins/axios';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const loadingStats = ref(false);
const loadingItems = ref(false);
const verifying    = ref(false);
const scanning     = ref(false);

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
  streamRestrict: null
});

const recentItems = ref([]);
const verificationResult = ref(null);

const verifyForm = ref({ txid: '' });

const scanResult = ref(null); // { scanned, mismatches: [...] }

const snackbar = ref({ show: false, message: '', color: 'success' });

// ---------------------------------------------------------------------------
// Table headers
// ---------------------------------------------------------------------------
const itemHeaders = [
  { title: 'TxID',         key: 'txid',          sortable: false },
  { title: 'Type',         key: 'type',          sortable: true  },
  { title: 'Entity',       key: 'entityId',      sortable: true  },
  { title: 'Timestamp',    key: 'ts',            sortable: true  },
  { title: 'Payload Hash', key: 'payloadHash',   sortable: false },
  { title: 'Confs',        key: 'confirmations', sortable: true  },
  { title: '',             key: 'actions',       sortable: false, align: 'end' }
];

const mismatchHeaders = [
  { title: 'TxID',          key: 'txid',         sortable: false },
  { title: 'Type',          key: 'type',         sortable: true  },
  { title: 'Entity',        key: 'entityId',     sortable: true  },
  { title: 'On-chain Hash', key: 'onChainHash',  sortable: false },
  { title: 'Reason',        key: 'reason',       sortable: false }
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const truncateHash = (hash) => {
  if (!hash || typeof hash !== 'string') return 'N/A';
  if (hash.length <= 24) return hash;
  return `${hash.slice(0, 16)}…${hash.slice(-8)}`;
};

const formatTime = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const showSnackbar = (message, color = 'success') => {
  snackbar.value = { show: true, message, color };
};

/**
 * Safely decode a MultiChain stream item's `data` field.
 *
 * Returns the parsed object, or null if the item isn't a JSON payload we
 * recognize. Never throws and never logs per-item (non-JSON items are
 * expected in streams that also carry raw binary data).
 */
const decodeStreamItem = (raw) => {
  if (!raw) return null;

  const { data } = raw;

  // Already-decoded object (future-proofing)
  if (data && typeof data === 'object') return data;

  if (typeof data !== 'string' || data.length === 0) return null;
  if (data.length % 2 !== 0) return null;
  if (!/^[0-9a-f]+$/i.test(data)) return null;

  let text;
  try {
    const bytes = new Uint8Array(data.length / 2);
    for (let i = 0; i < data.length; i += 2) {
      bytes[i / 2] = parseInt(data.slice(i, i + 2), 16);
    }
    text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch {
    return null;
  }

  // Our anchors are always JSON objects — skip anything else silently.
  const trimmed = text.trimStart();
  if (!trimmed.startsWith('{')) return null;

  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------
const loadStatus = async () => {
  loadingStats.value = true;
  try {
    const { data } = await api.get('/blockchain/status');
    status.value = { ...status.value, ...data };
  } catch (e) {
    showSnackbar('Failed to load chain status', 'error');
  } finally {
    loadingStats.value = false;
  }
};

const loadRecentItems = async () => {
  loadingItems.value = true;
  try {
    const { data } = await api.get('/blockchain/items', {
      params: { count: 20, verbose: true }
    });

    // tolerate bare array, {items:[]}, {data:[]}, {result:[]}
    const list = Array.isArray(data)
      ? data
      : data?.items || data?.data || data?.result || [];

    recentItems.value = list
      .map((raw) => {
        const decoded = decodeStreamItem(raw);
        if (!decoded) return null;
        return {
          txid:          raw.txid,
          key:           raw.key ?? raw.keys?.[0] ?? null,
          type:          decoded.type || null,
          entityId:      decoded.entity_id ?? null,
          ts:            decoded.ts || (raw.blocktime ? new Date(raw.blocktime * 1000).toISOString() : null),
          payloadHash:   decoded.payload_hash || null,
          actorId:       decoded.actor_id ?? null,
          confirmations: raw.confirmations ?? 0,
          _raw:          raw
        };
      })
      .filter(Boolean);
  } catch (e) {
    showSnackbar('Failed to load recent items', 'error');
    recentItems.value = [];
  } finally {
    loadingItems.value = false;
  }
};

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------
const verifyRecord = async () => {
  if (!verifyForm.value.txid) return;
  verifying.value = true;
  try {
    const { data } = await api.get(`/blockchain/verify/${verifyForm.value.txid}`);
    verificationResult.value = data;

    if (!data.found) {
      showSnackbar('TxID not found on chain', 'warning');
    } else if (data.matches === false) {
      showSnackbar('⚠ Hash mismatch — record modified', 'error');
    } else if (data.matches === true) {
      showSnackbar('Verified against blockchain');
    } else {
      showSnackbar('Fetched on-chain record');
    }
  } catch (e) {
    if (e?.response?.status === 404) {
      verificationResult.value = null;
      showSnackbar('TxID not found on chain', 'warning');
    } else {
      showSnackbar('Verification failed', 'error');
    }
  } finally {
    verifying.value = false;
  }
};

const verifyByTxid = (txid) => {
  verifyForm.value.txid = txid;
  verifyRecord();
};

// ---------------------------------------------------------------------------
// Scan recent activity
// ---------------------------------------------------------------------------
const scanRecentActivity = async () => {
  scanning.value = true;
  scanResult.value = null;
  try {
    const { data } = await api.get('/blockchain/items', {
      params: { count: 50, verbose: true }
    });

    const list = Array.isArray(data)
      ? data
      : data?.items || data?.data || data?.result || [];

    const mismatches = [];
    let scanned = 0;

    for (const raw of list) {
      const decoded = decodeStreamItem(raw);
      if (!decoded) continue;          // skip non-JSON items silently
      scanned++;

      if (!decoded.payload_hash || !/^[0-9a-f]{64}$/i.test(decoded.payload_hash)) {
        mismatches.push({
          txid: raw.txid,
          type: decoded.type || null,
          entityId: decoded.entity_id ?? null,
          onChainHash: decoded.payload_hash || null,
          reason: 'Missing or malformed payload_hash'
        });
      }
    }

    scanResult.value = { scanned, mismatches };
    showSnackbar(
      mismatches.length === 0
        ? `Scan complete. ${scanned} anchor(s) OK.`
        : `Scan complete. ${mismatches.length} issue(s) found.`,
      mismatches.length === 0 ? 'success' : 'warning'
    );
  } catch (e) {
    showSnackbar('Scan failed', 'error');
  } finally {
    scanning.value = false;
  }
};

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------
onMounted(async () => {
  await loadStatus();
  await loadRecentItems();
});
</script>