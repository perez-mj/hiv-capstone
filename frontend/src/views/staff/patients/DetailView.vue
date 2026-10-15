<!-- frontend/src/views/staff/patients/DetailView.vue -->
<template>
  <v-container fluid class="pa-4 patient-detail-view">
    <v-row>
      <v-col cols="12">
        <!-- ─────────────────────────────────────────────
             Header
        ───────────────────────────────────────────── -->
        <div class="header mb-4">
          <div class="d-flex align-center">
            <v-btn
              icon="mdi-arrow-left"
              variant="text"
              size="small"
              class="mr-2"
              @click="goBack"
            />
            <div>
              <h2 class="text-h6 font-weight-bold mb-0">
                {{ patient?.patient_facility_code || 'Patient Details' }}
              </h2>
              <p class="text-caption text-medium-emphasis mb-0">
                {{ patient ? fullName : 'Loading patient record…' }}
              </p>
            </div>
          </div>

          <div v-if="patient" class="d-flex ga-2 align-center">
            <v-tooltip location="bottom">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  :icon="maskSensitive ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                  variant="text"
                  color="primary"
                  @click="toggleMask"
                />
              </template>
              <div class="text-center">
                <div>{{ maskSensitive ? 'Show sensitive info' : 'Hide sensitive info' }}</div>
                <div class="text-caption text-medium-emphasis">Shift + M</div>
              </div>
            </v-tooltip>

            <v-btn
              color="primary"
              variant="tonal"
              prepend-icon="mdi-pencil"
              class="text-none"
              @click="editPatient"
            >
              Edit
            </v-btn>

            <v-btn
              v-if="canStartEncounter"
              color="success"
              variant="flat"
              :prepend-icon="encounterIcon"
              class="text-none"
              @click="startEncounter"
            >
              Start {{ encounterLabel }}
            </v-btn>
          </div>
        </div>

        <template v-if="patient">
          <!-- ─────────────────────────────────────────────
               Status strip
          ───────────────────────────────────────────── -->
          <v-card variant="flat" class="stat-strip mb-4">
            <v-card-text class="pa-4">
              <v-row dense align="center">
                <v-col cols="12" sm="6" md="3">
                  <div class="text-caption text-medium-emphasis">Status</div>
                  <v-chip
                    :color="patient.status === 'treatment' ? 'success' : 'info'"
                    size="small"
                    variant="flat"
                    :prepend-icon="patient.status === 'treatment' ? 'mdi-hospital' : 'mdi-test-tube'"
                    class="text-capitalize mt-1"
                  >
                    {{ patient.status }}
                  </v-chip>
                </v-col>
                <v-col cols="12" sm="6" md="3">
                  <div class="text-caption text-medium-emphasis">Portal Access</div>
                  <v-chip
                    :color="patient.user_id ? 'primary' : 'grey'"
                    size="small"
                    variant="tonal"
                    class="mt-1"
                  >
                    <v-icon start size="14">
                      {{ patient.user_id ? 'mdi-account-check' : 'mdi-account-off' }}
                    </v-icon>
                    {{ patient.user_id ? 'Enabled' : 'None' }}
                  </v-chip>
                </v-col>
                <v-col cols="12" sm="6" md="3">
                  <div class="text-caption text-medium-emphasis">Enrolled</div>
                  <div class="text-body-2 font-weight-medium mt-1">
                    {{ formatDate(patient.enrollment_date) }}
                  </div>
                </v-col>
                <v-col cols="12" sm="6" md="3">
                  <div class="text-caption text-medium-emphasis">Chain Status</div>
                  <v-chip
                    v-if="!loadingChain"
                    :color="chainStatusColor"
                    size="small"
                    variant="tonal"
                    class="mt-1"
                  >
                    {{ chainStatusText }}
                  </v-chip>
                  <v-chip v-else size="small" variant="tonal" color="info" class="mt-1">
                    Loading…
                  </v-chip>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- ─────────────────────────────────────────────
               Personal Info + Addresses
          ───────────────────────────────────────────── -->
          <v-row dense class="mb-4">
            <v-col cols="12" md="6">
              <v-card variant="flat" class="info-card h-100">
                <v-card-title class="d-flex align-center pa-4 pb-2">
                  <v-icon class="mr-2" color="primary">mdi-account-outline</v-icon>
                  <span class="text-subtitle-1 font-weight-bold">Personal Information</span>
                </v-card-title>
                <v-divider />
                <v-card-text class="pa-4">
                  <InfoRow label="Full Name">
                    <template v-if="maskSensitive">{{ maskName(patient) }}</template>
                    <template v-else>{{ fullName }}</template>
                  </InfoRow>
                  <InfoRow label="Facility Code">
                    <v-chip size="small" color="primary" variant="tonal" class="font-weight-medium">
                      {{ patient.patient_facility_code }}
                    </v-chip>
                  </InfoRow>
                  <InfoRow label="Date of Birth">
                    <template v-if="maskSensitive">••••••••••••</template>
                    <template v-else>
                      {{ formatDate(patient.birth_date) }}
                      <span class="text-caption text-medium-emphasis">
                        ({{ calculateAge(patient.birth_date) }} years)
                      </span>
                    </template>
                  </InfoRow>
                  <InfoRow label="Gender">
                    <span class="text-capitalize">
                      {{ maskSensitive ? '••••' : (patient.gender || 'N/A') }}
                    </span>
                  </InfoRow>
                  <InfoRow label="Contact Number">
                    <template v-if="maskSensitive">
                      {{ maskValue(patient.contact_number) }}
                    </template>
                    <template v-else-if="patient.contact_number">
                      <a
                        class="link-inline"
                        :href="`tel:${phoneHref(patient.contact_number)}`"
                      >
                        {{ patient.contact_number }}
                      </a>
                    </template>
                    <template v-else>N/A</template>
                  </InfoRow>
                  <InfoRow label="Email">
                    <template v-if="maskSensitive">
                      {{ maskEmail(patient.email) }}
                    </template>
                    <template v-else-if="patient.email">
                      <a
                        class="link-inline"
                        :href="`mailto:${patient.email}`"
                      >
                        {{ patient.email }}
                      </a>
                    </template>
                    <template v-else>N/A</template>
                  </InfoRow>
                  <InfoRow label="Facebook / Messenger">
                    <template v-if="maskSensitive">
                      {{ maskValue(patient.facebook_messenger) }}
                    </template>
                    <template v-else-if="patient.facebook_messenger">
                      <a
                        class="link-inline"
                        :href="facebookUrl(patient.facebook_messenger)"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <v-icon size="14" color="primary" class="mr-1">
                          mdi-facebook
                        </v-icon>
                        {{ patient.facebook_messenger }}
                      </a>
                    </template>
                    <template v-else>N/A</template>
                  </InfoRow>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" md="6">
              <v-card variant="flat" class="info-card h-100">
                <v-card-title class="d-flex align-center pa-4 pb-2">
                  <v-icon class="mr-2" color="primary">mdi-map-marker-outline</v-icon>
                  <span class="text-subtitle-1 font-weight-bold">Addresses</span>
                </v-card-title>
                <v-divider />
                <v-card-text class="pa-4">
                  <div class="mb-4">
                    <div class="d-flex align-center mb-1">
                      <v-icon size="16" color="primary" class="mr-1">mdi-home</v-icon>
                      <span class="text-caption text-medium-emphasis font-weight-medium">
                        Current Address
                      </span>
                    </div>
                    <div class="text-body-2">
                      {{ maskSensitive ? maskAddress(formattedCurrentAddress) : formattedCurrentAddress }}
                    </div>
                  </div>

                  <v-divider class="my-3" />

                  <div>
                    <div class="d-flex align-center mb-1">
                      <v-icon size="16" color="secondary" class="mr-1">mdi-home-account</v-icon>
                      <span class="text-caption text-medium-emphasis font-weight-medium">
                        Permanent Address
                      </span>
                      <v-chip
                        v-if="patient.same_as_current_address"
                        size="x-small"
                        color="info"
                        variant="tonal"
                        class="ml-2"
                      >
                        Same as current
                      </v-chip>
                    </div>
                    <div class="text-body-2">
                      {{ maskSensitive ? maskAddress(formattedPermanentAddress) : formattedPermanentAddress }}
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- ─────────────────────────────────────────────
               Enrollment Info
          ───────────────────────────────────────────── -->
          <v-card variant="flat" class="info-card mb-4">
            <v-card-title class="d-flex align-center pa-4 pb-2">
              <v-icon class="mr-2" color="primary">mdi-clipboard-text-outline</v-icon>
              <span class="text-subtitle-1 font-weight-bold">Enrollment Information</span>
            </v-card-title>
            <v-divider />
            <v-card-text class="pa-4">
              <v-row dense>
                <v-col cols="12" sm="6" md="4">
                  <InfoRow label="Enrollment Date" inline>
                    <v-icon size="14" color="primary" class="mr-1">mdi-calendar-plus</v-icon>
                    {{ formatDate(patient.enrollment_date) }}
                  </InfoRow>
                </v-col>
                <v-col
                  v-if="patient.treatment_transition_date"
                  cols="12"
                  sm="6"
                  md="4"
                >
                  <InfoRow label="Treatment Transition" inline>
                    <v-icon size="14" color="success" class="mr-1">mdi-calendar-check</v-icon>
                    {{ formatDate(patient.treatment_transition_date) }}
                  </InfoRow>
                </v-col>
                <v-col v-if="patient.purpose" cols="12" sm="6" md="4">
                  <InfoRow label="Purpose" inline>
                    <span class="text-capitalize">{{ patient.purpose }}</span>
                  </InfoRow>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- ─────────────────────────────────────────────
               Blockchain Verification panel
          ───────────────────────────────────────────── -->
          <v-card variant="flat" class="info-card mb-4">
            <v-card-title class="d-flex align-center flex-wrap ga-2 pa-4 pb-2">
              <v-icon class="mr-2" color="primary">mdi-link-chain</v-icon>
              <span class="text-subtitle-1 font-weight-bold">Blockchain Verification</span>

              <v-chip
                v-if="!loadingChain"
                :color="chainStatusColor"
                size="small"
                variant="tonal"
                class="ml-2"
              >
                {{ chainStatusText }}
              </v-chip>

              <v-spacer></v-spacer>

              <v-btn
                size="small"
                variant="tonal"
                color="primary"
                prepend-icon="mdi-refresh"
                class="text-none"
                :loading="loadingChain"
                @click="loadChainRecords"
              >
                Refresh
              </v-btn>

              <v-btn
                v-if="chainRecords.length"
                size="small"
                variant="tonal"
                color="secondary"
                prepend-icon="mdi-shield-check"
                class="text-none"
                :loading="verifyingAll"
                @click="verifyAllRecords"
              >
                Verify All
              </v-btn>
            </v-card-title>
            <v-divider />
            <v-card-text class="pa-4">
              <!-- TAMPER ALERT -->
              <v-alert
                v-if="chainVerifyResult && chainVerifyResult.found && chainVerifyResult.matches === false"
                type="error"
                variant="flat"
                prominent
                class="mb-3"
              >
                <div class="text-subtitle-1 font-weight-bold">
                  ⚠ Record has been tampered with
                </div>
                <div class="text-caption mt-1">
                  {{ chainVerifyResult.reason || 'Payload hash mismatch between the database and the blockchain.' }}
                </div>
                <div class="text-caption mt-2">
                  <div>
                    <strong>On-chain hash:</strong>
                    <code>{{ chainVerifyResult.onChainHash }}</code>
                  </div>
                  <div>
                    <strong>Recomputed from DB:</strong>
                    <code>{{ chainVerifyResult.recomputedHash }}</code>
                  </div>
                  <div>
                    <strong>Latest anchor txid:</strong>
                    <code>{{ chainVerifyResult.txid }}</code>
                  </div>
                </div>
              </v-alert>

              <!-- VERIFIED BANNER -->
              <v-alert
                v-else-if="chainVerifyResult && chainVerifyResult.found && chainVerifyResult.matches === true"
                type="success"
                variant="tonal"
                density="compact"
                class="mb-3"
              >
                <div class="text-subtitle-2 font-weight-bold">
                  ✓ Record verified against the blockchain
                </div>
                <div class="text-caption">
                  Latest anchor txid:
                  <code>{{ truncateHash(chainVerifyResult.txid) }}</code>
                </div>
              </v-alert>

              <!-- NO ANCHORS -->
              <v-alert
                v-if="!loadingChain && chainRecords.length === 0"
                type="info"
                variant="tonal"
                density="compact"
              >
                No on-chain records found for this patient yet.
                An anchor is written automatically after each create / update / delete.
              </v-alert>

              <!-- ANCHOR TABLE -->
              <v-data-table
                v-if="chainRecords.length"
                :headers="chainHeaders"
                :items="chainRecords"
                :loading="loadingChain"
                density="comfortable"
                item-value="txid"
                class="modern-table elevation-0"
                :items-per-page="5"
              >
                <template #item.txid="{ item }">
                  <div class="d-flex align-center">
                    <span class="text-caption font-monospace">
                      {{ truncateHash(item.txid) }}
                    </span>
                    <v-btn
                      icon
                      size="x-small"
                      variant="text"
                      class="ml-1"
                      @click="copyToClipboard(item.txid)"
                    >
                      <v-icon size="14">mdi-content-copy</v-icon>
                    </v-btn>
                  </div>
                </template>

                <template #item.type="{ item }">
                  <v-chip size="small" variant="tonal" :color="eventTypeColor(item.type)">
                    {{ item.type }}
                  </v-chip>
                </template>

                <template #item.ts="{ item }">
                  <span class="text-caption">{{ formatDateTime(item.ts) }}</span>
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

                <template #item.state="{ item }">
                  <v-chip
                    v-if="item._state"
                    size="small"
                    :color="item._state.color"
                    variant="flat"
                  >
                    <v-icon left size="14">{{ item._state.icon }}</v-icon>
                    {{ item._state.label }}
                  </v-chip>
                  <span v-else class="text-caption text-medium-emphasis">—</span>
                </template>

                <template #item.actions="{ item }">
                  <v-btn
                    size="small"
                    variant="text"
                    color="primary"
                    class="text-none"
                    :loading="item._verifying"
                    @click="verifySingleAnchor(item)"
                  >
                    Inspect
                  </v-btn>
                </template>
              </v-data-table>
            </v-card-text>
          </v-card>

          <!-- ─────────────────────────────────────────────
               History Tabs
          ───────────────────────────────────────────── -->
          <v-card variant="flat" class="info-card">
            <v-tabs v-model="activeTab" color="primary" density="comfortable">
              <v-tab value="testing">
                <v-icon start size="18">mdi-test-tube</v-icon>
                Testing History
              </v-tab>
              <v-tab value="treatment">
                <v-icon start size="18">mdi-pill</v-icon>
                Treatment History
              </v-tab>
              <v-tab value="appointments">
                <v-icon start size="18">mdi-calendar</v-icon>
                Appointments
              </v-tab>
            </v-tabs>
            <v-divider />

            <v-window v-model="activeTab">
              <!-- Testing History -->
              <v-window-item value="testing">
                <v-card-text class="pa-4">
                  <v-data-table
                    :headers="testingHeaders"
                    :items="testingHistory"
                    :loading="loadingHistory"
                    items-per-page="10"
                    class="modern-table elevation-0"
                  >
                    <template #item.hiv_test="{ item }">
                      <v-chip
                        :color="item.hiv_test?.result === 'positive'
                          ? 'error'
                          : item.hiv_test?.result === 'negative'
                            ? 'success'
                            : 'warning'"
                        size="small"
                        variant="tonal"
                      >
                        {{ item.hiv_test?.result || 'N/A' }}
                      </v-chip>
                    </template>
                    <template #item.created_at="{ item }">
                      {{ formatDate(item.created_at) }}
                    </template>
                    <template #item.actions="{ item }">
                      <v-btn
                        icon="mdi-eye-outline"
                        size="small"
                        variant="text"
                        color="primary"
                        @click="viewTestingEncounter(item)"
                      />
                    </template>
                  </v-data-table>
                </v-card-text>
              </v-window-item>

              <!-- Treatment History -->
              <v-window-item value="treatment">
                <v-card-text class="pa-4">
                  <v-data-table
                    :headers="treatmentHeaders"
                    :items="treatmentHistory"
                    :loading="loadingHistory"
                    items-per-page="10"
                    class="modern-table elevation-0"
                  >
                    <template #item.art_prescription="{ item }">
                      <div v-if="item.art_prescription">
                        {{ item.art_prescription.medication_name || 'N/A' }}
                        <span class="text-caption text-medium-emphasis">
                          ({{ item.art_prescription.dosage }})
                        </span>
                      </div>
                      <span v-else>N/A</span>
                    </template>
                    <template #item.created_at="{ item }">
                      {{ formatDate(item.created_at) }}
                    </template>
                    <template #item.actions="{ item }">
                      <v-btn
                        icon="mdi-eye-outline"
                        size="small"
                        variant="text"
                        color="primary"
                        @click="viewTreatmentEncounter(item)"
                      />
                    </template>
                  </v-data-table>
                </v-card-text>
              </v-window-item>

              <!-- Appointments -->
              <v-window-item value="appointments">
                <v-card-text class="pa-4">
                  <v-data-table
                    :headers="appointmentHeaders"
                    :items="appointments"
                    :loading="loadingHistory"
                    items-per-page="10"
                    class="modern-table elevation-0"
                  >
                    <template #item.time_slot="{ item }">
                      {{ formatTimeSlot(item.time_slot) }}
                    </template>
                    <template #item.status="{ item }">
                      <v-chip :color="getStatusColor(item.status)" size="small" variant="tonal">
                        {{ item.status }}
                      </v-chip>
                    </template>
                  </v-data-table>
                </v-card-text>
              </v-window-item>
            </v-window>
          </v-card>
        </template>

        <!-- Loading / not found -->
        <v-card v-else variant="flat" class="info-card">
          <v-card-text class="text-center py-8">
            <v-progress-circular v-if="loading" indeterminate color="primary" />
            <template v-else>
              <v-icon size="48" color="grey-lighten-1">mdi-account-off-outline</v-icon>
              <p class="text-body-2 text-medium-emphasis mt-3 mb-0">Patient not found</p>
              <v-btn
                variant="tonal"
                color="primary"
                size="small"
                prepend-icon="mdi-arrow-left"
                class="mt-3 text-none"
                @click="goBack"
              >
                Back to list
              </v-btn>
            </template>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- ═══════════════ Testing Encounter Dialog ═══════════════ -->
    <v-dialog v-model="testingDialog" max-width="800px">
      <v-card variant="flat" class="dialog-card">
        <v-card-title class="d-flex align-center pa-4">
          <v-icon class="mr-2" color="primary">mdi-test-tube</v-icon>
          <span class="text-subtitle-1 font-weight-bold">Testing Encounter Details</span>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" size="small" @click="testingDialog = false" />
        </v-card-title>
        <v-divider />
        <v-card-text v-if="selectedTesting" class="pa-4">
          <v-row dense>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 font-weight-bold mb-1">Pre-test Counseling</div>
              <div class="text-body-2">
                <span class="text-medium-emphasis">Conducted:</span>
                {{ selectedTesting.pretest_counseling?.conducted ? 'Yes' : 'No' }}
              </div>
              <div class="text-body-2">
                <span class="text-medium-emphasis">Notes:</span>
                {{ selectedTesting.pretest_counseling?.notes || 'N/A' }}
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 font-weight-bold mb-1">HIV Test</div>
              <div class="text-body-2">
                <span class="text-medium-emphasis">Result:</span>
                {{ selectedTesting.hiv_test?.result || 'N/A' }}
              </div>
              <div class="text-body-2">
                <span class="text-medium-emphasis">Kit Lot:</span>
                {{ selectedTesting.hiv_test?.kit_lot_number || 'N/A' }}
              </div>
              <div class="text-body-2">
                <span class="text-medium-emphasis">Test Date:</span>
                {{ selectedTesting.hiv_test?.test_date || 'N/A' }}
              </div>
            </v-col>
          </v-row>
          <v-divider class="my-3" />
          <div class="text-subtitle-2 font-weight-bold mb-1">Post-test Counseling</div>
          <div class="text-body-2">
            <span class="text-medium-emphasis">Conducted:</span>
            {{ selectedTesting.posttest_counseling?.conducted ? 'Yes' : 'No' }}
          </div>
          <div class="text-body-2">
            <span class="text-medium-emphasis">Notes:</span>
            {{ selectedTesting.posttest_counseling?.notes || 'N/A' }}
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- ═══════════════ Treatment Encounter Dialog ═══════════════ -->
    <v-dialog v-model="treatmentDialog" max-width="800px">
      <v-card variant="flat" class="dialog-card">
        <v-card-title class="d-flex align-center pa-4">
          <v-icon class="mr-2" color="primary">mdi-pill</v-icon>
          <span class="text-subtitle-1 font-weight-bold">Treatment Encounter Details</span>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" size="small" @click="treatmentDialog = false" />
        </v-card-title>
        <v-divider />
        <v-card-text v-if="selectedTreatment" class="pa-4">
          <v-row dense>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 font-weight-bold mb-1">Consultation</div>
              <div class="text-body-2">
                {{ selectedTreatment.consultation_notes?.subjective || 'N/A' }}
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-2 font-weight-bold mb-1">Prescription</div>
              <div v-if="selectedTreatment.art_prescription" class="text-body-2">
                {{ selectedTreatment.art_prescription.medication_name }}
                {{ selectedTreatment.art_prescription.dosage }}
                <br />
                <span class="text-caption text-medium-emphasis">
                  Refill: {{ selectedTreatment.art_prescription.refill_date || 'N/A' }}
                </span>
              </div>
              <div v-else class="text-body-2">No prescription</div>
            </v-col>
          </v-row>
          <v-divider class="my-3" />
          <div class="text-subtitle-2 font-weight-bold mb-1">Lab Results</div>
          <div v-if="selectedTreatment.lab_results && selectedTreatment.lab_results.length">
            <v-chip
              v-for="lab in selectedTreatment.lab_results"
              :key="lab.type"
              size="small"
              variant="tonal"
              class="mr-2 mb-1"
            >
              {{ lab.type }}: {{ lab.value }}
            </v-chip>
          </div>
          <div v-else class="text-body-2">No lab results recorded</div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="top" rounded="lg">
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

<script>
import { ref, computed, onMounted, onBeforeUnmount, watch, h } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import patientService from '@/services/patientService'
import appointmentService from '@/services/appointmentService'
import locationService from '@/services/locationService'
import api from '@/plugins/axios'
import { useAuthStore } from '@/stores/authStore'

/* ─────────────── Reusable InfoRow component ─────────────── */
const InfoRow = {
  name: 'InfoRow',
  props: {
    label: { type: String, required: true },
    inline: { type: Boolean, default: false }
  },
  setup(props, { slots }) {
    return () =>
      h('div', { class: props.inline ? '' : 'mb-3' }, [
        h(
          'div',
          { class: 'text-caption text-medium-emphasis font-weight-medium mb-1' },
          props.label
        ),
        h('div', { class: 'text-body-2' }, slots.default ? slots.default() : '—')
      ])
  }
}

export default {
  name: 'PatientDetail',
  components: { InfoRow },
  setup() {
    const router = useRouter()
    const route = useRoute()
    const authStore = useAuthStore()

    const MASK_STORAGE_KEY = 'patient-list:maskSensitive'

    const patient = ref(null)
    const loading = ref(false)
    const loadingHistory = ref(false)
    const activeTab = ref('testing')
    const testingHistory = ref([])
    const treatmentHistory = ref([])
    const appointments = ref([])
    const testingDialog = ref(false)
    const treatmentDialog = ref(false)
    const selectedTesting = ref(null)
    const selectedTreatment = ref(null)

    const maskSensitive = ref(localStorage.getItem(MASK_STORAGE_KEY) === 'true')

    const currentAddressNames = ref({
      region: null,
      province: null,
      city: null,
      barangay: null
    })

    const permanentAddressNames = ref({
      region: null,
      province: null,
      city: null,
      barangay: null
    })

    const chainRecords = ref([])
    const loadingChain = ref(false)
    const verifyingAll = ref(false)
    const chainVerifyResult = ref(null)

    const snackbar = ref({
      show: false,
      message: '',
      color: 'success'
    })

    /* ─────────────── Table headers ─────────────── */
    const testingHeaders = [
      { title: 'Date', key: 'created_at' },
      { title: 'Pre-test', key: 'pretest_counseling.conducted', align: 'center' },
      { title: 'Result', key: 'hiv_test', align: 'center' },
      { title: 'Post-test', key: 'posttest_counseling.conducted', align: 'center' },
      { title: 'Actions', key: 'actions', align: 'center', sortable: false, width: '100px' }
    ]

    const treatmentHeaders = [
      { title: 'Date', key: 'created_at' },
      { title: 'Prescription', key: 'art_prescription' },
      { title: 'Next Appointment', key: 'next_appointment_date', align: 'center' },
      { title: 'Actions', key: 'actions', align: 'center', sortable: false, width: '100px' }
    ]

    const appointmentHeaders = [
      { title: 'Date', key: 'appointment_date' },
      { title: 'Time', key: 'time_slot', align: 'center' },
      { title: 'Office', key: 'office', align: 'center' },
      { title: 'Transaction Type', key: 'TransactionType.name', align: 'center' },
      { title: 'Status', key: 'status', align: 'center' }
    ]

    const chainHeaders = [
      { title: 'TxID', key: 'txid', sortable: false },
      { title: 'Event', key: 'type', sortable: true },
      { title: 'Timestamp', key: 'ts', sortable: true },
      { title: 'Confs', key: 'confirmations', sortable: true, align: 'center' },
      { title: 'Status', key: 'state', sortable: false, align: 'center' },
      { title: '', key: 'actions', sortable: false, align: 'end' }
    ]

    /* ─────────────── Computeds ─────────────── */
    const fullName = computed(() => {
      if (!patient.value) return 'N/A'
      const parts = [
        patient.value.first_name,
        patient.value.middle_name,
        patient.value.last_name,
        patient.value.suffix
      ].filter(Boolean)
      return parts.join(' ') || 'N/A'
    })

    const joinAddressParts = (parts) => {
      const clean = parts.filter(Boolean)
      return clean.length ? clean.join(', ') : 'N/A'
    }

    const formattedCurrentAddress = computed(() => {
      if (!patient.value) return 'N/A'
      return joinAddressParts([
        patient.value.sitio_street,
        currentAddressNames.value.barangay,
        currentAddressNames.value.city,
        currentAddressNames.value.province,
        currentAddressNames.value.region
      ])
    })

    const formattedPermanentAddress = computed(() => {
      if (!patient.value) return 'N/A'
      if (patient.value.same_as_current_address) {
        return formattedCurrentAddress.value
      }
      return joinAddressParts([
        patient.value.permanent_sitio_street,
        permanentAddressNames.value.barangay,
        permanentAddressNames.value.city,
        permanentAddressNames.value.province,
        permanentAddressNames.value.region
      ])
    })

    const canStartEncounter = computed(() => {
      if (!patient.value) return false
      const office = authStore.userOffice
      if (office === 'testing') return patient.value.status === 'testing'
      if (office === 'treatment') return patient.value.status === 'treatment'
      return false
    })

    const encounterLabel = computed(() =>
      authStore.userOffice === 'testing' ? 'Testing' : 'Treatment'
    )

    const encounterIcon = computed(() =>
      authStore.userOffice === 'testing' ? 'mdi-test-tube' : 'mdi-pill'
    )

    const chainStatusColor = computed(() => {
      if (loadingChain.value) return 'info'
      if (!chainRecords.value.length) return 'warning'
      const r = chainVerifyResult.value
      if (!r || !r.found) return 'grey'
      return r.matches ? 'success' : 'error'
    })

    const chainStatusText = computed(() => {
      if (loadingChain.value) return 'Loading…'
      if (!chainRecords.value.length) return 'No anchors'
      const r = chainVerifyResult.value
      if (!r || !r.found) return 'Not verified'
      return r.matches ? 'Verified' : 'TAMPERED'
    })

    /* ─────────────── Mask toggle ─────────────── */
    function toggleMask() {
      maskSensitive.value = !maskSensitive.value
    }

    watch(maskSensitive, (val) => {
      localStorage.setItem(MASK_STORAGE_KEY, String(val))
    })

    /* ─────────────── Keyboard shortcut ─────────────── */
    function isTypingTarget(el) {
      if (!el) return false
      const tag = el.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
      if (el.isContentEditable) return true
      if (el.closest?.('[role="combobox"], .v-select, .v-autocomplete, .v-overlay-container')) return true
      return false
    }

    function handleKeydown(event) {
      if (event.shiftKey && (event.key === 'M' || event.key === 'm')) {
        if (isTypingTarget(event.target)) return
        event.preventDefault()
        toggleMask()
      }
    }

    /* ─────────────── Masking helpers ─────────────── */
    function maskValue(value) {
      if (!value) return 'N/A'
      const str = String(value)
      if (str.length <= 4) return '••••'
      return '•'.repeat(str.length - 4) + str.slice(-4)
    }

    function maskName(p) {
      const last = p.last_name?.charAt(0) || ''
      const first = p.first_name?.charAt(0) || ''
      const middle = p.middle_name?.charAt(0) || ''
      const suffix = p.suffix || ''
      let masked = `${first}•••• ${last}••••`
      if (middle) masked += ` ${middle}••`
      if (suffix) masked += ` ${suffix}`
      return masked
    }

    function maskEmail(email) {
      if (!email) return 'N/A'
      const [local, domain] = String(email).split('@')
      if (!domain) return '••••'
      const maskedLocal = local.length <= 2
        ? '••'
        : local.charAt(0) + '•'.repeat(local.length - 2) + local.slice(-1)
      return `${maskedLocal}@${domain}`
    }

    function maskAddress(address) {
      if (!address || address === 'N/A') return 'N/A'
      return '••••••••••••••••'
    }

    /* ─────────────── Link helpers ─────────────── */
    /**
     * Strip everything except digits and a leading "+" so tel: links
     * work across dialers that don't tolerate spaces or parentheses.
     */
    function phoneHref(phone) {
      if (!phone) return ''
      return String(phone).replace(/[^\d+]/g, '')
    }

    /**
     * Build a Facebook URL from either a username, a full URL, or a
     * "facebook.com/..." style handle.
     */
    function facebookUrl(value) {
      if (!value) return ''
      const v = String(value).trim()
      if (/^https?:\/\//i.test(v)) return v
      if (/^(www\.)?facebook\.com\//i.test(v)) return `https://${v.replace(/^www\./, '')}`
      if (/^(www\.)?m\.me\//i.test(v)) return `https://${v.replace(/^www\./, '')}`
      // Bare username / handle
      return `https://facebook.com/${v.replace(/^@/, '')}`
    }

    /* ─────────────── Patient + history loading ─────────────── */
    const loadPatient = async () => {
      const patientId = route.params.id
      if (!patientId) return
      loading.value = true
      try {
        patient.value = await patientService.getPatient(patientId)
      } catch (error) {
        showSnackbar('Failed to load patient: ' + error.message, 'error')
      } finally {
        loading.value = false
      }
    }

    const loadHistory = async () => {
      const patientId = route.params.id
      if (!patientId) return
      loadingHistory.value = true
      try {
        const history = await patientService.getPatientHistory(patientId)
        testingHistory.value = history.testing || []
        treatmentHistory.value = history.treatment || []

        const appointmentData =
          await appointmentService.getAppointmentsByPatient(patientId)
        appointments.value = appointmentData || []
      } catch (error) {
        console.error('Failed to load history:', error)
        showSnackbar('Failed to load patient history: ' + error.message, 'error')
      } finally {
        loadingHistory.value = false
      }
    }

    /* ─────────────── Address name resolution ─────────────── */
    const resolveAddressNames = async ({ barangay_id, city_municipality_id, province_id }) => {
      const empty = { region: null, province: null, city: null, barangay: null }
      if (!barangay_id && !city_municipality_id && !province_id) return empty

      if (typeof locationService.resolveAddress === 'function') {
        try {
          const resolved = await locationService.resolveAddress({
            barangay_id,
            city_municipality_id,
            province_id
          })
          if (
            (!province_id || resolved.province) &&
            (!city_municipality_id || resolved.city) &&
            (!barangay_id || resolved.barangay)
          ) {
            return resolved
          }
        } catch (e) {
          /* fall through */
        }
      }

      const out = { ...empty }
      try {
        const regions = await locationService.getRegions()

        if (province_id) {
          for (const r of regions) {
            const provs = await locationService.getProvinces(r.id)
            const match = provs.find((p) => p.id === province_id)
            if (match) {
              out.region = r.name
              out.province = match.name
              break
            }
          }
        }

        if (city_municipality_id) {
          if (province_id) {
            const cities = await locationService.getCitiesByProvince(province_id)
            const city = cities.find((c) => c.id === city_municipality_id)
            if (city) out.city = city.name
          } else {
            for (const r of regions) {
              const cities = await locationService.getCitiesByRegion(r.id)
              const city = cities.find((c) => c.id === city_municipality_id)
              if (city) {
                out.region = r.name
                out.city = city.name
                break
              }
            }
          }
        }

        if (barangay_id && city_municipality_id) {
          const barangays = await locationService.getBarangays(city_municipality_id)
          const brgy = barangays.find((b) => b.id === barangay_id)
          if (brgy) out.barangay = brgy.name
        }
      } catch (e) {
        console.warn('Failed to resolve address names:', e)
      }

      return out
    }

    const loadAddressNames = async () => {
      if (!patient.value) return
      const p = patient.value

      try {
        currentAddressNames.value = await resolveAddressNames({
          barangay_id: p.barangay_id,
          city_municipality_id: p.city_municipality_id,
          province_id: p.province_id
        })

        if (p.same_as_current_address) {
          permanentAddressNames.value = { ...currentAddressNames.value }
        } else {
          permanentAddressNames.value = await resolveAddressNames({
            barangay_id: p.permanent_barangay_id,
            city_municipality_id: p.permanent_city_municipality_id,
            province_id: p.permanent_province_id
          })
        }
      } catch (e) {
        console.warn('Failed to resolve address names:', e)
      }
    }

    /* ─────────────── Blockchain loading ─────────────── */
    const loadChainRecords = async () => {
      const patientId = patient.value?.id
      if (!patientId) return

      loadingChain.value = true
      try {
        const { data } = await api.get('/blockchain/items', {
          params: { count: 500, verbose: true }
        })
        const list = Array.isArray(data) ? data : []

        chainRecords.value = list
          .map(decodeStreamItem)
          .filter((x) => x && x.record)
          .filter((x) => String(x.record.entity_id) === String(patientId))
          .map((x) => ({
            txid: x.txid,
            key: x.key,
            type: x.record.type,
            entityId: x.record.entity_id,
            ts: x.record.ts,
            payloadHash: x.record.payload_hash,
            confirmations: x.confirmations ?? 0,
            _state: null,
            _verifying: false
          }))
          .sort((a, b) => new Date(b.ts) - new Date(a.ts))

        chainVerifyResult.value = null
      } catch (e) {
        showSnackbar('Failed to load blockchain records', 'error')
        chainRecords.value = []
      } finally {
        loadingChain.value = false
      }
    }

    /* ─────────────── Verification ─────────────── */
    const verifyPatient = async () => {
      const patientId = patient.value?.id
      if (!patientId) return null

      const { data } = await api.get(`/blockchain/verify/patient/${patientId}`)
      chainVerifyResult.value = data

      chainRecords.value.forEach((row) => {
        if (row.txid === data.txid) {
          row._state = data.matches
            ? { label: 'Verified', color: 'success', icon: 'mdi-shield-check' }
            : { label: 'TAMPERED', color: 'error', icon: 'mdi-shield-alert' }
        } else {
          row._state = null
        }
      })

      return data
    }

    const verifyAllRecords = async () => {
      verifyingAll.value = true
      try {
        const data = await verifyPatient()
        if (!data || !data.found) {
          showSnackbar('No anchor found for this patient', 'warning')
          return
        }
        showSnackbar(
          data.matches
            ? 'Patient record verified against the blockchain'
            : '⚠ WARNING — record has been tampered with',
          data.matches ? 'success' : 'error'
        )
      } catch (e) {
        showSnackbar(
          'Verification failed: ' + (e?.response?.data?.error || e.message),
          'error'
        )
      } finally {
        verifyingAll.value = false
      }
    }

    const verifySingleAnchor = async (row) => {
      row._verifying = true
      try {
        const data = await verifyPatient()
        if (!data || !data.found) {
          showSnackbar('No anchor found for this patient', 'warning')
        } else if (data.matches) {
          showSnackbar('Record verified against the blockchain')
        } else {
          showSnackbar('⚠ Record has been tampered with', 'error')
        }
      } catch (e) {
        showSnackbar('Verification failed', 'error')
      } finally {
        row._verifying = false
      }
    }

    /* ─────────────── Helpers ─────────────── */
    const decodeStreamItem = (raw) => {
      if (!raw) return null
      let record = null
      try {
        const hex = raw.data
        if (typeof Buffer !== 'undefined') {
          record = JSON.parse(Buffer.from(hex, 'hex').toString('utf8'))
        } else {
          const bytes = new Uint8Array(
            hex.match(/.{1,2}/g).map((b) => parseInt(b, 16))
          )
          record = JSON.parse(new TextDecoder('utf-8').decode(bytes))
        }
      } catch {
        record = null
      }
      return {
        txid: raw.txid,
        key: raw.key,
        record,
        confirmations: raw.confirmations ?? 0,
        blocktime: raw.blocktime
      }
    }

    const goBack = () => router.push('/patients')
    const editPatient = () => router.push(`/patients/${patient.value.id}/edit`)

    const startEncounter = () => {
      const office = authStore.userOffice || 'testing'
      router.push(`/${office}/encounter/${patient.value.id}`)
    }

    const viewTestingEncounter = (encounter) => {
      selectedTesting.value = encounter
      testingDialog.value = true
    }

    const viewTreatmentEncounter = (encounter) => {
      selectedTreatment.value = encounter
      treatmentDialog.value = true
    }

    const calculateAge = (birthDate) => {
      if (!birthDate) return 'N/A'
      const today = new Date()
      const birth = new Date(birthDate)
      let age = today.getFullYear() - birth.getFullYear()
      const m = today.getMonth() - birth.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
      return age
    }

    const formatDate = (date) => {
      if (!date) return 'N/A'
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    const formatDateTime = (iso) => {
      if (!iso) return 'N/A'
      return new Date(iso).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    }

    const formatTimeSlot = (time) => {
      if (!time) return 'N/A'
      const parts = time.split(':')
      const hour = parseInt(parts[0])
      const minute = parts[1]
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const hour12 = hour % 12 || 12
      return `${hour12}:${minute} ${ampm}`
    }

    const getStatusColor = (status) => {
      const colors = {
        pending: 'info',
        'checked-in': 'warning',
        completed: 'success',
        cancelled: 'error',
        'no-show': 'grey'
      }
      return colors[status] || 'primary'
    }

    const truncateHash = (hash) => {
      if (!hash) return '—'
      if (hash.length <= 24) return hash
      return `${hash.slice(0, 14)}…${hash.slice(-8)}`
    }

    const eventTypeColor = (type) => {
      if (!type) return 'grey'
      if (type.startsWith('patient.create')) return 'success'
      if (type.startsWith('patient.update')) return 'info'
      if (type.startsWith('patient.soft_delete')) return 'error'
      if (type.startsWith('patient.hard_delete')) return 'deep-orange'
      if (type.startsWith('patient.code_regenerate')) return 'warning'
      if (type.startsWith('patient.bulk_generate_codes')) return 'purple'
      if (type.startsWith('testing.')) return 'purple'
      if (type.startsWith('treatment.')) return 'teal'
      return 'primary'
    }

    const copyToClipboard = async (text) => {
      try {
        await navigator.clipboard.writeText(text)
        showSnackbar('TxID copied')
      } catch {
        showSnackbar('Copy failed', 'error')
      }
    }

    const showSnackbar = (message, color = 'success') => {
      snackbar.value = { show: true, message, color }
    }

    /* ─────────────── Lifecycle ─────────────── */
    onMounted(async () => {
      await loadPatient()
      await Promise.all([
        loadHistory(),
        loadChainRecords(),
        loadAddressNames()
      ])
      if (chainRecords.value.length) {
        try {
          await verifyPatient()
        } catch {
          /* verification errors are surfaced via the panel state */
        }
      }
      window.addEventListener('keydown', handleKeydown)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('keydown', handleKeydown)
    })

    return {
      patient,
      loading,
      loadingHistory,
      activeTab,
      testingHistory,
      treatmentHistory,
      appointments,
      testingDialog,
      treatmentDialog,
      selectedTesting,
      selectedTreatment,

      maskSensitive,
      toggleMask,
      maskValue,
      maskName,
      maskEmail,
      maskAddress,
      phoneHref,
      facebookUrl,

      fullName,
      formattedCurrentAddress,
      formattedPermanentAddress,
      currentAddressNames,
      permanentAddressNames,

      testingHeaders,
      treatmentHeaders,
      appointmentHeaders,
      chainHeaders,

      canStartEncounter,
      encounterLabel,
      encounterIcon,
      editPatient,
      startEncounter,
      viewTestingEncounter,
      viewTreatmentEncounter,
      goBack,

      calculateAge,
      formatDate,
      formatDateTime,
      formatTimeSlot,
      getStatusColor,
      truncateHash,
      eventTypeColor,
      copyToClipboard,

      chainRecords,
      loadingChain,
      verifyingAll,
      chainVerifyResult,
      chainStatusColor,
      chainStatusText,
      loadChainRecords,
      verifyAllRecords,
      verifySingleAnchor,

      snackbar
    }
  }
}
</script>

<style scoped>
.patient-detail-view {
  max-width: 1400px;
  margin: 0 auto;
}

/* ─── Header ─── */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}

/* ─── Cards ─── */
.info-card,
.stat-strip,
.dialog-card {
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
}

/* ─── Modern table styling ─── */
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
  padding-top: 14px !important;
  padding-bottom: 14px !important;
}

/* ─── Inline links (email / phone / facebook) ─── */
.link-inline {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
  transition: color 0.15s ease;
  word-break: break-word;
}

.link-inline:hover {
  text-decoration: underline;
  cursor: pointer;
}

/* ─── Responsive ─── */
@media (max-width: 600px) {
  .header {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>