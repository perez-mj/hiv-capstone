<!-- frontend/src/components/appointments/QuickScheduleDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="640"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="quick-schedule-card">
      <!-- Header -->
      <div class="dialog-header">
        <div class="d-flex align-center">
          <v-avatar size="40" color="primary" variant="tonal" class="mr-3">
            <v-icon>mdi-calendar-plus</v-icon>
          </v-avatar>
          <div>
            <h3 class="text-h6 font-weight-bold mb-0">Schedule follow-up</h3>
            <p class="text-caption text-medium-emphasis mb-0">
              Optional — book the next visit for this patient
            </p>
          </div>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          :disabled="saving"
          @click="close"
        />
      </div>

      <v-divider />

      <v-card-text class="pa-6">
        <!-- Patient summary -->
        <v-alert
          v-if="patient"
          variant="tonal"
          color="primary"
          density="compact"
          class="mb-4"
        >
          <div class="d-flex align-center">
            <v-icon size="18" class="mr-2">mdi-account</v-icon>
            <span class="font-weight-medium">{{ patientFullName }}</span>
            <span
              v-if="patient.patient_facility_code"
              class="text-caption text-medium-emphasis ml-2"
            >
              · {{ patient.patient_facility_code }}
            </span>
          </div>
        </v-alert>

        <v-form ref="formRef" v-model="formValid" @submit.prevent>
          <v-row dense>
            <v-col cols="12">
              <v-select
                v-model="form.transaction_type_id"
                :items="transactionTypes"
                item-title="name"
                item-value="id"
                label="Transaction Type *"
                :rules="[v => !!v || 'Transaction type is required']"
                variant="outlined"
                density="comfortable"
                :loading="loadingTypes"
                prepend-inner-icon="mdi-tag"
              >
                <template #item="{ props, item }">
                  <v-list-item v-bind="props">
                    <template #prepend>
                      <v-avatar
                        size="10"
                        :color="item.raw.color_code || 'grey'"
                        class="mr-2"
                      />
                    </template>
                    <v-list-item-subtitle v-if="item.raw.estimated_duration_minutes">
                      {{ item.raw.estimated_duration_minutes }} min
                    </v-list-item-subtitle>
                  </v-list-item>
                </template>
              </v-select>
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.appointment_date"
                label="Date *"
                type="date"
                variant="outlined"
                density="comfortable"
                :min="todayIso"
                :rules="[v => !!v || 'Date is required']"
                prepend-inner-icon="mdi-calendar"
                @update:model-value="loadSlots"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-select
                v-model="form.time_slot"
                :items="slotOptions"
                item-title="label"
                item-value="value"
                label="Time slot *"
                :rules="[v => !!v || 'Time slot is required']"
                variant="outlined"
                density="comfortable"
                :loading="loadingSlots"
                :disabled="!form.appointment_date"
                :no-data-text="slotsEmptyMessage"
                prepend-inner-icon="mdi-clock-outline"
              />
            </v-col>

            <!-- ← Quick notes (optional, short) -->
            <v-col cols="12">
              <v-textarea
                v-model="form.notes"
                label="Quick notes (optional)"
                placeholder="e.g. Follow-up in 4 weeks for CD4 recheck"
                variant="outlined"
                density="comfortable"
                rows="2"
                auto-grow
                maxlength="200"
                counter="200"
                prepend-inner-icon="mdi-note-text-outline"
              />
            </v-col>
          </v-row>

          <v-alert
            v-if="serverError"
            type="error"
            variant="tonal"
            density="compact"
            class="mt-2"
            closable
            @click:close="serverError = ''"
          >
            {{ serverError }}
          </v-alert>
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-btn
          variant="text"
          class="text-none"
          :disabled="saving"
          @click="close"
        >
          Skip
        </v-btn>
        <v-spacer />
        <v-btn
          color="primary"
          variant="flat"
          class="text-none"
          :loading="saving"
          :disabled="!formValid"
          prepend-icon="mdi-calendar-check"
          @click="save"
        >
          Schedule
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import appointmentService from '@/services/appointmentService';
import transactionTypeService from '@/services/transactionTypeService';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  patient: { type: Object, default: null },
  office: { type: String, default: null },   // 'testing' | 'treatment'
});
const emit = defineEmits(['update:modelValue', 'scheduled']);

/* ─────────────── State ─────────────── */
const formRef = ref(null);
const formValid = ref(false);
const saving = ref(false);
const serverError = ref('');

const transactionTypes = ref([]);
const loadingTypes = ref(false);

const slotOptions = ref([]);
const loadingSlots = ref(false);
const slotsEmptyMessage = ref('Select a date first');

const form = reactive({
  transaction_type_id: null,
  appointment_date: null,
  time_slot: null,
  notes: '',
});

/* ─────────────── Computed ─────────────── */
const patientFullName = computed(() => {
  if (!props.patient) return '';
  const p = props.patient;
  return [p.first_name, p.middle_name, p.last_name, p.suffix].filter(Boolean).join(' ');
});

const todayIso = computed(() => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
});

/* ─────────────── Loaders ─────────────── */
async function loadTypes() {
  if (!props.office) return;
  loadingTypes.value = true;
  try {
    const list = await transactionTypeService.getTransactionTypes(props.office, { is_active: true });
    transactionTypes.value = Array.isArray(list) ? list : [];
    if (!form.transaction_type_id && list.length === 1) {
      form.transaction_type_id = list[0].id;
    }
  } catch (e) {
    console.error('Load types error:', e);
  } finally {
    loadingTypes.value = false;
  }
}

async function loadSlots() {
  if (!form.appointment_date) {
    slotOptions.value = [];
    return;
  }
  loadingSlots.value = true;
  form.time_slot = null;
  try {
    const result = await appointmentService.getAvailableSlots(
      form.appointment_date,
      props.office,
      props.patient?.id
    );
    const slots = result?.slots || [];
    slotOptions.value = slots.map((s) => ({
      label: s.time,
      value: s.time,
    }));
    slotsEmptyMessage.value =
      slotOptions.value.length === 0
        ? (result?.message || 'No available slots for this date')
        : '';
  } catch (e) {
    console.error('Load slots error:', e);
    slotOptions.value = [];
    slotsEmptyMessage.value = 'Failed to load slots';
  } finally {
    loadingSlots.value = false;
  }
}

/* ─────────────── Lifecycle ─────────────── */
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      serverError.value = '';
      form.appointment_date = todayIso.value;
      form.time_slot = null;
      form.notes = '';
      if (!transactionTypes.value.length) loadTypes();
    }
  }
);

watch(
  () => form.appointment_date,
  () => loadSlots()
);

/* ─────────────── Actions ─────────────── */
function close() {
  if (saving.value) return;
  emit('update:modelValue', false);
}

async function save() {
  if (!formValid.value || saving.value) return;
  if (!props.patient?.id) {
    serverError.value = 'Missing patient';
    return;
  }
  saving.value = true;
  serverError.value = '';
  try {
    const created = await appointmentService.createAppointment({
      patient_id: props.patient.id,
      transaction_type_id: form.transaction_type_id,
      appointment_date: form.appointment_date,
      time_slot: form.time_slot,
      notes: form.notes?.trim() || '',
    });
    emit('scheduled', created);
    emit('update:modelValue', false);
  } catch (e) {
    console.error('Schedule error:', e);
    serverError.value =
      e.response?.data?.error ||
      e.response?.data?.message ||
      'Failed to schedule appointment';
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.quick-schedule-card {
  border-radius: 16px;
  overflow: hidden;
}
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
}
</style>