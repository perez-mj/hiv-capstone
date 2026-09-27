<!-- frontend/src/components/settings/GeneralSettingsTab.vue -->
<template>
  <div class="pa-4">
    <!-- Filter Bar -->
    <v-row align="center" class="mb-4">
      <v-col cols="12" md="5">
        <v-text-field
          v-model="search"
          label="Search Settings"
          prepend-inner-icon="mdi-magnify"
          clearable
          density="compact"
          hide-details
          variant="outlined"
        />
      </v-col>
      <v-col cols="12" md="3" class="d-flex align-center justify-end">
        <v-chip
          :color="filteredSettings.length === 0 ? 'error' : 'success'"
          size="small"
          label
        >
          {{ filteredSettings.length }} settings
        </v-chip>
      </v-col>
    </v-row>

    <!-- Loading State -->
    <v-row v-if="loading" justify="center" class="pa-8">
      <v-progress-circular indeterminate color="primary" size="48" />
    </v-row>

    <!-- No Data State -->
    <v-row v-else-if="filteredSettings.length === 0" justify="center" class="pa-8">
      <div class="text-center">
        <v-icon size="48" color="grey-lighten-1">mdi-cog-off</v-icon>
        <p class="text-subtitle-1 text-medium-emphasis mt-2">No settings found</p>
        <v-btn color="primary" variant="text" @click="loadSettings">Refresh</v-btn>
      </div>
    </v-row>

    <!-- Settings Form -->
    <v-form v-else ref="settingsForm" @submit.prevent="saveAllSettings">
      <v-card variant="outlined" class="mb-4">
        <v-card-text class="pa-4">
          <template v-for="(setting, index) in filteredSettings" :key="setting.key">
            <v-row class="setting-row mb-4">
              <!-- Label -->
              <v-col cols="12" md="3" class="d-flex align-center">
                <div class="d-flex align-center">
                  <v-icon
                    size="small"
                    :color="getCategoryColor(setting.category)"
                    class="mr-2"
                  >
                    mdi-tag
                  </v-icon>
                  <div>
                    <div class="font-weight-medium">{{ keyToLabel(setting.key) }}</div>
                    <div class="text-caption text-medium-emphasis">{{ setting.description }}</div>
                  </div>
                </div>
              </v-col>

              <!-- Value Input -->
              <v-col cols="12" md="9">
                <!-- Boolean -->
                <v-switch
                  v-if="setting.data_type === 'boolean'"
                  v-model="formValues[setting.key]"
                  :label="isTruthy(formValues[setting.key]) ? 'Enabled' : 'Disabled'"
                  color="primary"
                  hide-details
                  density="compact"
                  true-value="true"
                  false-value="false"
                />

                <!-- Number -->
                <v-text-field
                  v-else-if="setting.data_type === 'number'"
                  v-model.number="formValues[setting.key]"
                  type="number"
                  :label="keyToLabel(setting.key)"
                  density="compact"
                  hide-details
                  variant="outlined"
                />

                <!-- JSON -->
                <v-textarea
                  v-else-if="setting.data_type === 'json'"
                  v-model="formValues[setting.key]"
                  :label="keyToLabel(setting.key)"
                  rows="3"
                  density="compact"
                  hide-details
                  variant="outlined"
                  :error-messages="jsonErrors[setting.key]"
                  @update:model-value="validateJson(setting.key)"
                />

                <!-- String -->
                <v-text-field
                  v-else
                  v-model="formValues[setting.key]"
                  :label="keyToLabel(setting.key)"
                  density="compact"
                  hide-details
                  variant="outlined"
                />

                <!-- Description -->
                <div
                  v-if="setting.description"
                  class="text-caption text-medium-emphasis mt-1"
                >
                  {{ setting.description }}
                </div>
              </v-col>
            </v-row>

            <v-divider
              v-if="index < filteredSettings.length - 1"
              class="mb-4"
            />
          </template>
        </v-card-text>
      </v-card>

      <!-- Save / Reset Buttons -->
      <div class="d-flex justify-end ga-2">
        <v-btn
          color="grey"
          variant="text"
          :disabled="!hasChanges || saving"
          @click="resetForm"
        >
          Reset
        </v-btn>
        <v-btn
          color="primary"
          :disabled="!hasChanges || hasJsonErrors"
          :loading="saving"
          @click="saveAllSettings"
        >
          Save
        </v-btn>
      </div>
    </v-form>

    <!-- Snackbar -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="4000"
      location="top"
    >
      <v-icon start>{{ snackbar.icon }}</v-icon>
      {{ snackbar.message }}
      <template #actions>
        <v-btn variant="text" @click="snackbar.show = false">Close</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import SettingService from '@/services/settingService'

const loading = ref(false)
const saving = ref(false)
const settings = ref([])
const formValues = ref({})
const search = ref('')
const selectedCategory = ref(null)
const settingsForm = ref(null)
const jsonErrors = ref({})

const snackbar = ref({
  show: false,
  message: '',
  color: 'success',
  icon: 'mdi-check-circle'
})

/* ─── Helpers ─────────────────────────────────────────────── */

const isTruthy = (val) =>
  val === true || val === 'true' || val === '1' || val === 1

/** Convert a typed JS value into the string the form input uses. */
const toFormValue = (setting) => {
  const v = setting.typedValue
  if (v === null || v === undefined) return ''
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'number') return String(v)
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v, null, 2)
    } catch {
      return String(v)
    }
  }
  return String(v)
}

/** Convert a form string back into the typed value expected by the API. */
const fromFormValue = (raw, dataType) => {
  if (raw === '' || raw === null || raw === undefined) return ''
  switch (dataType) {
    case 'boolean':
      return raw === 'true' || raw === true || raw === '1'
    case 'number': {
      const n = Number(raw)
      return Number.isNaN(n) ? raw : n
    }
    case 'json':
      try {
        return JSON.parse(raw)
      } catch {
        return raw
      }
    default:
      return raw
  }
}

function keyToLabel(key) {
  if (!key) return ''
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/* ─── Computed ────────────────────────────────────────────── */

const filteredSettings = computed(() => {
  let result = settings.value
  if (search.value) {
    const s = search.value.toLowerCase()
    result = result.filter(
      (item) =>
        item.key.toLowerCase().includes(s) ||
        (item.description && item.description.toLowerCase().includes(s)) ||
        keyToLabel(item.key).toLowerCase().includes(s)
    )
  }
  if (selectedCategory.value) {
    result = result.filter((i) => i.category === selectedCategory.value)
  }
  return result
})

const hasChanges = computed(() =>
  settings.value.some(
    (s) => formValues.value[s.key] !== toFormValue(s)
  )
)

const hasJsonErrors = computed(() => Object.keys(jsonErrors.value).length > 0)

/* ─── Lifecycle ───────────────────────────────────────────── */

const loadSettings = async () => {
  loading.value = true
  try {
    settings.value = await SettingService.getAllSettings()
    resetForm()
  } catch (error) {
    showSnackbar('Failed to load settings: ' + error.message, 'error')
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  const values = {}
  settings.value.forEach((s) => {
    values[s.key] = toFormValue(s)
  })
  formValues.value = values
  jsonErrors.value = {}
}

/* ─── Validation ──────────────────────────────────────────── */

const validateJson = (key) => {
  const raw = formValues.value[key]
  if (!raw) {
    delete jsonErrors.value[key]
    return
  }
  try {
    JSON.parse(raw)
    delete jsonErrors.value[key]
  } catch {
    jsonErrors.value[key] = 'Invalid JSON'
  }
}

/* ─── Save ────────────────────────────────────────────────── */

const saveAllSettings = async () => {
  // Validate all JSON fields first
  settings.value
    .filter((s) => s.data_type === 'json')
    .forEach((s) => validateJson(s.key))

  if (hasJsonErrors.value) {
    showSnackbar('Please fix invalid JSON before saving', 'error')
    return
  }

  const updates = settings.value
    .filter((s) => formValues.value[s.key] !== toFormValue(s))
    .map((s) => ({
      key: s.key,
      value: fromFormValue(formValues.value[s.key], s.data_type),
      data_type: s.data_type
    }))

  if (updates.length === 0) return

  saving.value = true
  try {
    await SettingService.updateMultipleSettings(updates)
    showSnackbar(`${updates.length} setting(s) updated successfully`)
    await loadSettings()
  } catch (error) {
    showSnackbar('Failed to save settings: ' + error.message, 'error')
  } finally {
    saving.value = false
  }
}

/* ─── UI Helpers ──────────────────────────────────────────── */

const getCategoryColor = (category) =>
  ({
    clinic_operations: 'blue-darken-2',
    appointment: 'teal-darken-2',
    clinical: 'red-darken-2',
    kiosk: 'purple-darken-2',
    security: 'grey-darken-2',
    appearance: 'pink-darken-2',
    notifications: 'cyan-darken-2',
    queue: 'orange-darken-2',
    registration: 'green-darken-2',
    compliance: 'brown-darken-2'
  }[category] || 'grey')

const showSnackbar = (message, color = 'success') => {
  const icons = {
    success: 'mdi-check-circle',
    error: 'mdi-alert-circle',
    warning: 'mdi-alert',
    info: 'mdi-information'
  }
  snackbar.value = {
    show: true,
    message,
    color,
    icon: icons[color] || icons.info
  }
}

onMounted(loadSettings)
</script>

<style scoped>
.setting-row {
  align-items: flex-start;
}
</style>