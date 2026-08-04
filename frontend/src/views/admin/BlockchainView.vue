<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex justify-space-between align-center">
            <div>Blockchain Verification</div>
            <v-btn color="primary" @click="scanForTampering">
              <v-icon left>mdi-shield-search</v-icon>
              Scan for Tampering
            </v-btn>
          </v-card-title>
          
          <v-card-text>
            <!-- Blockchain Stats -->
            <v-row>
              <v-col cols="12" md-3>
                <v-card color="primary" dark class="text-center pa-3">
                  <v-icon size="30">mdi-link-chain</v-icon>
                  <div class="text-h4 mt-2">{{ blockchainStats.totalBlocks || 0 }}</div>
                  <div>Total Blocks</div>
                </v-card>
              </v-col>
              
              <v-col cols="12" md-3>
                <v-card :color="blockchainStats.chainValid ? 'success' : 'error'" dark class="text-center pa-3">
                  <v-icon size="30">mdi-shield-check</v-icon>
                  <div class="text-h4 mt-2">{{ blockchainStats.chainValid ? 'Valid' : 'Invalid' }}</div>
                  <div>Chain Status</div>
                </v-card>
              </v-col>
            </v-row>
            
            <!-- Verification Form -->
            <v-row class="mt-4">
              <v-col cols="12">
                <v-card outlined>
                  <v-card-title>Verify Single Record</v-card-title>
                  <v-card-text>
                    <v-row>
                      <v-col cols="12" md-4>
                        <v-select
                          v-model="verifyForm.recordType"
                          :items="recordTypes"
                          label="Record Type"
                        ></v-select>
                      </v-col>
                      <v-col cols="12" md-4>
                        <v-text-field
                          v-model="verifyForm.recordId"
                          label="Record ID"
                          type="number"
                        ></v-text-field>
                      </v-col>
                      <v-col cols="12" md-4>
                        <v-btn
                          color="primary"
                          block
                          @click="verifyRecord"
                          :disabled="!verifyForm.recordId"
                        >
                          Verify
                        </v-btn>
                      </v-col>
                    </v-row>
                    
                    <!-- Verification Result -->
                    <v-expand-transition>
                      <v-card v-if="verificationResult" class="mt-4" outlined>
                        <v-card-title>
                          Verification Result
                          <v-chip :color="verificationResult.isValid ? 'success' : 'error'" class="ml-2">
                            {{ verificationResult.isValid ? 'VALID' : 'TAMPERED' }}
                          </v-chip>
                        </v-card-title>
                        <v-card-text>
                          <v-list dense>
                            <v-list-item>
                              <v-list-item-content>
                                <v-list-item-title class="font-weight-bold">Stored Hash</v-list-item-title>
                                <v-list-item-subtitle class="text-caption">{{ verificationResult.storedHash }}</v-list-item-subtitle>
                              </v-list-item-content>
                            </v-list-item>
                            <v-list-item>
                              <v-list-item-content>
                                <v-list-item-title class="font-weight-bold">Recomputed Hash</v-list-item-title>
                                <v-list-item-subtitle class="text-caption">{{ verificationResult.recomputedHash }}</v-list-item-subtitle>
                              </v-list-item-content>
                            </v-list-item>
                            <v-list-item>
                              <v-list-item-content>
                                <v-list-item-title class="font-weight-bold">Previous Hash</v-list-item-title>
                                <v-list-item-subtitle class="text-caption">{{ verificationResult.previousHash }}</v-list-item-subtitle>
                              </v-list-item-content>
                            </v-list-item>
                          </v-list>
                        </v-card-text>
                      </v-card>
                    </v-expand-transition>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
            
            <!-- Tampered Records -->
            <v-row class="mt-4">
              <v-col cols="12">
                <v-card outlined>
                  <v-card-title>
                    Tampered Records
                    <v-spacer></v-spacer>
                    <v-btn
                      v-if="tamperedRecords.length > 0"
                      color="warning"
                      @click="repairChain"
                    >
                      <v-icon left>mdi-wrench</v-icon>
                      Repair Chain
                    </v-btn>
                  </v-card-title>
                  <v-card-text>
                    <v-data-table
                      :headers="tamperHeaders"
                      :items="tamperedRecords"
                      :loading="scanning"
                      class="elevation-1"
                    >
                      <template v-slot:item.expectedHash="{ item }">
                        <div class="text-caption">{{ truncateHash(item.expectedHash) }}</div>
                      </template>
                      <template v-slot:item.actualHash="{ item }">
                        <div class="text-caption">{{ truncateHash(item.actualHash) }}</div>
                      </template>
                    </v-data-table>
                    
                    <v-alert v-if="scanComplete && tamperedRecords.length === 0" type="success" class="mt-4">
                      No tampered records found. Blockchain integrity verified.
                    </v-alert>
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

const scanning = ref(false);
const scanComplete = ref(false);
const blockchainStats = ref({});
const verificationResult = ref(null);
const tamperedRecords = ref([]);

const verifyForm = ref({
  recordType: 'testing',
  recordId: ''
});

const recordTypes = [
  { title: 'Testing Encounter', value: 'testing' },
  { title: 'Treatment Encounter', value: 'treatment' }
];

const tamperHeaders = [
  { title: 'Record ID', key: 'id', sortable: true },
  { title: 'Record Type', key: 'recordType', sortable: true },
  { title: 'Expected Hash', key: 'expectedHash', sortable: false },
  { title: 'Actual Hash', key: 'actualHash', sortable: false }
];

const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
});

const truncateHash = (hash) => {
  if (!hash) return 'N/A';
  return hash.substring(0, 16) + '...' + hash.substring(hash.length - 8);
};

const loadBlockchainStats = async () => {
  try {
    const response = await api.get('/blockchain/stats');
    blockchainStats.value = response.data;
  } catch (error) {
    showSnackbar('Failed to load blockchain stats', 'error');
  }
};

const verifyRecord = async () => {
  try {
    const response = await api.get(`/blockchain/verify/${verifyForm.value.recordType}/${verifyForm.value.recordId}`);
    verificationResult.value = response.data;
    showSnackbar('Verification completed');
  } catch (error) {
    showSnackbar('Verification failed', 'error');
  }
};

const scanForTampering = async () => {
  scanning.value = true;
  scanComplete.value = false;
  try {
    const response = await api.get('/blockchain/scan-tampering');
    tamperedRecords.value = response.data.tamperedRecords;
    scanComplete.value = true;
    showSnackbar(`Scan completed. Found ${response.data.totalTampered} tampered records.`);
  } catch (error) {
    showSnackbar('Scan failed', 'error');
  } finally {
    scanning.value = false;
  }
};

const repairChain = async () => {
  if (!confirm('This will rebuild the entire blockchain chain. Continue?')) return;
  
  try {
    await api.post('/blockchain/repair', { recordType: 'testing' });
    await api.post('/blockchain/repair', { recordType: 'treatment' });
    showSnackbar('Blockchain chain repaired successfully');
    await scanForTampering();
    await loadBlockchainStats();
  } catch (error) {
    showSnackbar('Repair failed', 'error');
  }
};

const showSnackbar = (message, color = 'success') => {
  snackbar.value = {
    show: true,
    message,
    color
  };
};

onMounted(() => {
  loadBlockchainStats();
});
</script>