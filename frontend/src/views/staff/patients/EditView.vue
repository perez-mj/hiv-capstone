<!-- frontend/src/views/staff/patients/EditView.vue -->
<template>
  <v-container fluid class="pa-4 patient-edit-view">
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
              @click="cancel"
            />
            <div>
              <h2 class="text-h6 font-weight-bold mb-0">Edit Patient</h2>
              <p class="text-caption text-medium-emphasis mb-0">
                {{ patient.id ? patient.patient_facility_code : 'Loading…' }}
              </p>
            </div>
          </div>

          <div v-if="patient.id" class="d-flex ga-2 align-center">
            <v-btn
              color="error"
              variant="text"
              class="text-none"
              @click="cancel"
            >
              Cancel
            </v-btn>
            <v-btn
              color="primary"
              variant="flat"
              prepend-icon="mdi-content-save"
              class="text-none"
              :loading="submitting"
              :disabled="!valid"
              @click="submit"
            >
              Update Patient
            </v-btn>
          </div>
        </div>

        <!-- ─────────────────────────────────────────────
             Loading skeleton
        ───────────────────────────────────────────── -->
        <v-card v-if="loading" variant="flat" class="info-card">
          <v-card-text class="pa-4">
            <v-skeleton-loader type="article, actions" />
          </v-card-text>
        </v-card>

        <!-- ─────────────────────────────────────────────
             Not found
        ───────────────────────────────────────────── -->
        <v-card v-else-if="!patient.id" variant="flat" class="info-card">
          <v-card-text class="text-center py-8">
            <v-icon size="48" color="grey-lighten-1">mdi-account-off-outline</v-icon>
            <p class="text-body-2 text-medium-emphasis mt-3 mb-0">Patient not found</p>
            <v-btn
              variant="tonal"
              color="primary"
              size="small"
              prepend-icon="mdi-arrow-left"
              class="mt-3 text-none"
              @click="cancel"
            >
              Back to list
            </v-btn>
          </v-card-text>
        </v-card>

        <!-- ─────────────────────────────────────────────
             Form
        ───────────────────────────────────────────── -->
        <v-form v-else ref="form" v-model="valid">
          <!-- ==================== PERSONAL INFO ==================== -->
          <v-card variant="flat" class="info-card mb-4">
            <v-card-title class="d-flex align-center pa-4 pb-2">
              <v-icon class="mr-2" color="primary">mdi-account-outline</v-icon>
              <span class="text-subtitle-1 font-weight-bold">Personal Information</span>
            </v-card-title>
            <v-divider />
            <v-card-text class="pa-4">
              <v-row dense>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="patient.first_name"
                    label="First Name *"
                    variant="outlined"
                    density="comfortable"
                    :rules="[v => !!v || 'First name is required']"
                    hide-details="auto"
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="patient.middle_name"
                    label="Middle Name"
                    variant="outlined"
                    density="comfortable"
                    hide-details="auto"
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="patient.last_name"
                    label="Last Name *"
                    variant="outlined"
                    density="comfortable"
                    :rules="[v => !!v || 'Last name is required']"
                    hide-details="auto"
                  />
                </v-col>

                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="patient.suffix"
                    label="Suffix"
                    persistent-hint
                    variant="outlined"
                    density="comfortable"
                  />
                </v-col>

                <v-col cols="12" md="4">
                  <v-menu
                    v-model="dateMenu"
                    :close-on-content-click="false"
                    transition="scale-transition"
                  >
                    <template #activator="{ props }">
                      <v-text-field
                        v-model="patient.birth_date"
                        label="Date of Birth *"
                        prepend-inner-icon="mdi-calendar"
                        readonly
                        :rules="[v => !!v || 'Date of birth is required']"
                        v-bind="props"
                        variant="outlined"
                        density="comfortable"
                        hide-details="auto"
                      />
                    </template>
                    <v-date-picker
                      v-model="patient.birth_date"
                      :max="today"
                      @update:model-value="dateMenu = false"
                    />
                  </v-menu>
                </v-col>

                <v-col cols="12" md="4">
                  <v-select
                    v-model="patient.gender"
                    :items="genderOptions"
                    item-title="title"
                    item-value="value"
                    label="Gender *"
                    :rules="[v => !!v || 'Gender is required']"
                    variant="outlined"
                    density="comfortable"
                    hide-details="auto"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="patient.contact_number"
                    label="Contact Number *"
                    :rules="[
                      v => !!v || 'Contact number is required',
                      v => /^[0-9+\-\s()]{7,20}$/.test(v) || 'Invalid contact number'
                    ]"
                    variant="outlined"
                    density="comfortable"
                    hide-details="auto"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="patient.email"
                    label="Email"
                    type="email"
                    :rules="[v => !v || /.+@.+\..+/.test(v) || 'Invalid email']"
                    variant="outlined"
                    density="comfortable"
                    hide-details="auto"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="patient.facebook_messenger"
                    label="Facebook / Messenger"
                    prepend-inner-icon="mdi-facebook"
                    variant="outlined"
                    density="comfortable"
                    hide-details="auto"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="patient.patient_facility_code"
                    label="Facility Code"
                    readonly
                    prepend-inner-icon="mdi-barcode"
                    hint="Auto-generated — regenerated when status moves to Treatment"
                    persistent-hint
                    variant="outlined"
                    density="comfortable"
                  />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- ==================== CURRENT ADDRESS ==================== -->
          <v-card variant="flat" class="info-card mb-4">
            <v-card-title class="d-flex align-center pa-4 pb-2">
              <v-icon class="mr-2" color="primary">mdi-home-outline</v-icon>
              <span class="text-subtitle-1 font-weight-bold">Current Address</span>
            </v-card-title>
            <v-divider />
            <v-card-text class="pa-4">
              <v-row dense>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="selectedRegionId"
                    :items="regions"
                    item-title="name"
                    item-value="id"
                    label="Region"
                    :loading="loadingRegions"
                    variant="outlined"
                    density="comfortable"
                    clearable
                    hide-details="auto"
                    @update:model-value="onRegionChange"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-select
                    v-model="patient.province_id"
                    :items="provinces"
                    item-title="name"
                    item-value="id"
                    label="Province"
                    :loading="loadingProvinces"
                    :disabled="!selectedRegionId || provinces.length === 0"
                    clearable
                    variant="outlined"
                    density="comfortable"
                    :hint="provinces.length === 0 && selectedRegionId
                      ? 'No provinces for this region (e.g. NCR)'
                      : ''"
                    persistent-hint
                    @update:model-value="onProvinceChange"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-select
                    v-model="patient.city_municipality_id"
                    :items="cities"
                    item-title="name"
                    item-value="id"
                    label="City / Municipality"
                    :loading="loadingCities"
                    :disabled="!selectedRegionId"
                    variant="outlined"
                    density="comfortable"
                    hide-details="auto"
                    @update:model-value="onCityChange"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-select
                    v-model="patient.barangay_id"
                    :items="barangays"
                    item-title="name"
                    item-value="id"
                    label="Barangay"
                    :loading="loadingBarangays"
                    :disabled="!patient.city_municipality_id"
                    variant="outlined"
                    density="comfortable"
                    hide-details="auto"
                  />
                </v-col>

                <v-col cols="12">
                  <v-text-field
                    v-model="patient.sitio_street"
                    label="House No. / Street / Purok / Sitio"
                    variant="outlined"
                    density="comfortable"
                    hide-details="auto"
                  />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- ==================== PERMANENT ADDRESS ==================== -->
          <v-card variant="flat" class="info-card mb-4">
            <v-card-title class="d-flex align-center flex-wrap ga-2 pa-4 pb-2">
              <v-icon class="mr-2" color="primary">mdi-home-account</v-icon>
              <span class="text-subtitle-1 font-weight-bold">Permanent Address</span>
              <v-spacer></v-spacer>
              <v-checkbox
                v-model="patient.same_as_current_address"
                label="Same as current address"
                color="primary"
                density="compact"
                hide-details
                class="mt-0"
              />
            </v-card-title>
            <v-divider />

            <v-card-text v-if="!patient.same_as_current_address" class="pa-4">
              <v-row dense>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="permanentRegionId"
                    :items="regions"
                    item-title="name"
                    item-value="id"
                    label="Region"
                    :loading="loadingRegions"
                    variant="outlined"
                    density="comfortable"
                    clearable
                    hide-details="auto"
                    @update:model-value="onPermanentRegionChange"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-select
                    v-model="patient.permanent_province_id"
                    :items="permanentProvinces"
                    item-title="name"
                    item-value="id"
                    label="Province"
                    :loading="loadingPermanentProvinces"
                    :disabled="!permanentRegionId || permanentProvinces.length === 0"
                    clearable
                    variant="outlined"
                    density="comfortable"
                    :hint="permanentProvinces.length === 0 && permanentRegionId
                      ? 'No provinces for this region (e.g. NCR)'
                      : ''"
                    persistent-hint
                    @update:model-value="onPermanentProvinceChange"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-select
                    v-model="patient.permanent_city_municipality_id"
                    :items="permanentCities"
                    item-title="name"
                    item-value="id"
                    label="City / Municipality"
                    :loading="loadingPermanentCities"
                    :disabled="!permanentRegionId"
                    variant="outlined"
                    density="comfortable"
                    hide-details="auto"
                    @update:model-value="onPermanentCityChange"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-select
                    v-model="patient.permanent_barangay_id"
                    :items="permanentBarangays"
                    item-title="name"
                    item-value="id"
                    label="Barangay"
                    :loading="loadingPermanentBarangays"
                    :disabled="!patient.permanent_city_municipality_id"
                    variant="outlined"
                    density="comfortable"
                    hide-details="auto"
                  />
                </v-col>

                <v-col cols="12">
                  <v-text-field
                    v-model="patient.permanent_sitio_street"
                    label="House No. / Street / Purok / Sitio"
                    variant="outlined"
                    density="comfortable"
                    hide-details="auto"
                  />
                </v-col>
              </v-row>
            </v-card-text>

            <v-card-text v-else class="pa-4">
              <v-alert
                type="info"
                variant="tonal"
                density="compact"
                prepend-icon="mdi-information-outline"
              >
                Permanent address will mirror the current address.
              </v-alert>
            </v-card-text>
          </v-card>

          <!-- ==================== PURPOSE + ENROLLMENT ==================== -->
          <v-card variant="flat" class="info-card mb-4">
            <v-card-title class="d-flex align-center pa-4 pb-2">
              <v-icon class="mr-2" color="primary">mdi-clipboard-text-outline</v-icon>
              <span class="text-subtitle-1 font-weight-bold">Enrollment</span>
            </v-card-title>
            <v-divider />
            <v-card-text class="pa-4">
              <v-row dense>
                <v-col cols="12" md="4">
                  <v-select
                    v-model="patient.purpose"
                    :items="purposeOptions"
                    item-title="title"
                    item-value="value"
                    label="Purpose"
                    hint="Testing or Treatment"
                    persistent-hint
                    variant="outlined"
                    density="comfortable"
                  />
                </v-col>

                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="patient.enrollment_date"
                    label="Enrollment Date"
                    prepend-inner-icon="mdi-calendar-plus"
                    readonly
                    variant="outlined"
                    density="comfortable"
                    hide-details="auto"
                  />
                </v-col>

                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="patient.treatment_transition_date"
                    label="Treatment Transition Date"
                    prepend-inner-icon="mdi-calendar-check"
                    readonly
                    variant="outlined"
                    density="comfortable"
                    :hint="patient.treatment_transition_date
                      ? 'Set automatically when moved to treatment'
                      : 'Not yet in treatment'"
                    persistent-hint
                  />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- ==================== PORTAL STATUS ==================== -->
          <v-card variant="flat" class="info-card mb-4">
            <v-card-title class="d-flex align-center pa-4 pb-2">
              <v-icon class="mr-2" color="primary">mdi-account-key-outline</v-icon>
              <span class="text-subtitle-1 font-weight-bold">Portal Access</span>
            </v-card-title>
            <v-divider />
            <v-card-text class="pa-4">
              <v-alert
                v-if="patient.user_id"
                type="success"
                variant="tonal"
                density="comfortable"
                prepend-icon="mdi-account-check"
              >
                Portal account is linked
                <span v-if="patient.user_email">
                  — <strong>{{ patient.user_email }}</strong>
                </span>
              </v-alert>

              <v-alert
                v-else
                type="info"
                variant="tonal"
                density="comfortable"
                prepend-icon="mdi-information-outline"
              >
                No portal account linked. Portal accounts are created at
                patient registration.
              </v-alert>
            </v-card-text>
          </v-card>

          <!-- ==================== ACTION BAR ==================== -->
          <div class="d-flex justify-end ga-2 mb-4">
            <v-btn
              color="error"
              variant="text"
              class="text-none"
              @click="cancel"
            >
              Cancel
            </v-btn>
            <v-btn
              color="primary"
              variant="flat"
              prepend-icon="mdi-content-save"
              class="text-none"
              :loading="submitting"
              :disabled="!valid"
              @click="submit"
            >
              Update Patient
            </v-btn>
          </div>
        </v-form>
      </v-col>
    </v-row>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000" location="top" rounded="lg">
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
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import patientService from '@/services/patientService'
import locationService from '@/services/locationService'

export default {
  name: 'PatientEdit',
  setup() {
    const router = useRouter()
    const route = useRoute()
    const form = ref(null)
    const valid = ref(false)
    const submitting = ref(false)
    const dateMenu = ref(false)
    const loading = ref(true)

    const today = new Date().toISOString().split('T')[0]

    // NOTE: `status` is intentionally NOT here — it is derived server-side
    // and no longer editable from the patient form.
    const patient = reactive({
      id: null,
      user_id: null,
      user_email: '',

      first_name: '',
      middle_name: '',
      last_name: '',
      suffix: '',
      birth_date: '',
      gender: '',
      contact_number: '',
      email: '',
      facebook_messenger: '',

      sitio_street: '',
      barangay_id: null,
      city_municipality_id: null,
      province_id: null,

      same_as_current_address: false,
      permanent_sitio_street: '',
      permanent_barangay_id: null,
      permanent_city_municipality_id: null,
      permanent_province_id: null,

      purpose: '',
      patient_facility_code: '',
      enrollment_date: '',
      treatment_transition_date: ''
    })

    const snackbar = ref({ show: false, message: '', color: 'success' })

    const genderOptions = [
      { title: 'Male', value: 'male' },
      { title: 'Female', value: 'female' },
      { title: 'Other', value: 'other' }
    ]

    const purposeOptions = [
      { title: 'Testing', value: 'testing' },
      { title: 'Treatment', value: 'treatment' }
    ]

    // ---------------- CURRENT ADDRESS CASCADING ----------------
    const regions = ref([])
    const provinces = ref([])
    const cities = ref([])
    const barangays = ref([])
    const selectedRegionId = ref(null)
    const loadingRegions = ref(false)
    const loadingProvinces = ref(false)
    const loadingCities = ref(false)
    const loadingBarangays = ref(false)

    // ---------------- PERMANENT ADDRESS CASCADING ----------------
    const permanentRegionId = ref(null)
    const permanentProvinces = ref([])
    const permanentCities = ref([])
    const permanentBarangays = ref([])
    const loadingPermanentProvinces = ref(false)
    const loadingPermanentCities = ref(false)
    const loadingPermanentBarangays = ref(false)

    // ---------------- LOAD PATIENT ----------------
    const loadPatient = async () => {
      const patientId = route.params.id
      if (!patientId) {
        loading.value = false
        return
      }

      loading.value = true
      try {
        const data = await patientService.getPatient(patientId)
        Object.assign(patient, {
          id: data.id,
          user_id: data.user_id,
          user_email: data.User?.email || '',

          first_name: data.first_name || '',
          middle_name: data.middle_name || '',
          last_name: data.last_name || '',
          suffix: data.suffix || '',
          birth_date: data.birth_date || '',
          gender: data.gender || '',
          contact_number: data.contact_number || '',
          email: data.email || '',
          facebook_messenger: data.facebook_messenger || '',

          sitio_street: data.sitio_street || '',
          barangay_id: data.barangay_id || null,
          city_municipality_id: data.city_municipality_id || null,
          province_id: data.province_id || null,

          same_as_current_address: !!data.same_as_current_address,
          permanent_sitio_street: data.permanent_sitio_street || '',
          permanent_barangay_id: data.permanent_barangay_id || null,
          permanent_city_municipality_id: data.permanent_city_municipality_id || null,
          permanent_province_id: data.permanent_province_id || null,

          purpose: data.purpose || '',
          patient_facility_code: data.patient_facility_code || '',
          enrollment_date: data.enrollment_date || '',
          treatment_transition_date: data.treatment_transition_date || ''
        })

        await hydrateCurrentAddressHierarchy()
        if (!patient.same_as_current_address) {
          await hydratePermanentAddressHierarchy()
        }
      } catch (error) {
        const msg = error.response?.data?.error || error.message
        showSnackbar('Failed to load patient: ' + msg, 'error')
      } finally {
        loading.value = false
      }
    }

    const hydrateCurrentAddressHierarchy = async () => {
      if (!patient.province_id && !patient.city_municipality_id) return

      if (patient.province_id) {
        for (const r of regions.value) {
          try {
            const provs = await locationService.getProvinces(r.id)
            if (provs.some(p => p.id === patient.province_id)) {
              selectedRegionId.value = r.id
              provinces.value = provs
              break
            }
          } catch { /* skip */ }
        }
      } else if (patient.city_municipality_id) {
        for (const r of regions.value) {
          try {
            const cs = await locationService.getCitiesByRegion(r.id)
            if (cs.some(c => c.id === patient.city_municipality_id)) {
              selectedRegionId.value = r.id
              cities.value = cs
              break
            }
          } catch { /* skip */ }
        }
      }

      if (selectedRegionId.value) {
        try {
          if (provinces.value.length === 0) {
            provinces.value = await locationService.getProvinces(selectedRegionId.value)
          }
        } catch { provinces.value = [] }

        if (patient.province_id) {
          try {
            cities.value = await locationService.getCitiesByProvince(patient.province_id)
          } catch { cities.value = [] }
        } else if (cities.value.length === 0) {
          try {
            cities.value = await locationService.getCitiesByRegion(selectedRegionId.value)
          } catch { cities.value = [] }
        }

        if (patient.city_municipality_id) {
          try {
            barangays.value = await locationService.getBarangays(patient.city_municipality_id)
          } catch { barangays.value = [] }
        }
      }
    }

    const hydratePermanentAddressHierarchy = async () => {
      if (!patient.permanent_province_id && !patient.permanent_city_municipality_id) return

      if (patient.permanent_province_id) {
        for (const r of regions.value) {
          try {
            const provs = await locationService.getProvinces(r.id)
            if (provs.some(p => p.id === patient.permanent_province_id)) {
              permanentRegionId.value = r.id
              permanentProvinces.value = provs
              break
            }
          } catch { /* skip */ }
        }
      } else if (patient.permanent_city_municipality_id) {
        for (const r of regions.value) {
          try {
            const cs = await locationService.getCitiesByRegion(r.id)
            if (cs.some(c => c.id === patient.permanent_city_municipality_id)) {
              permanentRegionId.value = r.id
              permanentCities.value = cs
              break
            }
          } catch { /* skip */ }
        }
      }

      if (permanentRegionId.value) {
        try {
          if (permanentProvinces.value.length === 0) {
            permanentProvinces.value = await locationService.getProvinces(permanentRegionId.value)
          }
        } catch { permanentProvinces.value = [] }

        if (patient.permanent_province_id) {
          try {
            permanentCities.value = await locationService.getCitiesByProvince(patient.permanent_province_id)
          } catch { permanentCities.value = [] }
        } else if (permanentCities.value.length === 0) {
          try {
            permanentCities.value = await locationService.getCitiesByRegion(permanentRegionId.value)
          } catch { permanentCities.value = [] }
        }

        if (patient.permanent_city_municipality_id) {
          try {
            permanentBarangays.value = await locationService.getBarangays(patient.permanent_city_municipality_id)
          } catch { permanentBarangays.value = [] }
        }
      }
    }

    // ---------------- LOCATION LOADERS ----------------
    const loadRegions = async () => {
      loadingRegions.value = true
      try {
        regions.value = await locationService.getRegions()
      } catch (e) {
        showSnackbar('Failed to load regions', 'error')
      } finally {
        loadingRegions.value = false
      }
    }

    // ---------- Current address cascading ----------
    const onRegionChange = async (regionId) => {
      patient.province_id = null
      patient.city_municipality_id = null
      patient.barangay_id = null
      provinces.value = []
      cities.value = []
      barangays.value = []

      if (!regionId) return

      loadingProvinces.value = true
      try {
        provinces.value = await locationService.getProvinces(regionId)
      } catch (e) {
        provinces.value = []
      } finally {
        loadingProvinces.value = false
      }

      loadingCities.value = true
      try {
        cities.value = await locationService.getCitiesByRegion(regionId)
      } catch (e) {
        cities.value = []
      } finally {
        loadingCities.value = false
      }
    }

    const onProvinceChange = async (provinceId) => {
      patient.city_municipality_id = null
      patient.barangay_id = null
      cities.value = []
      barangays.value = []

      if (!provinceId) {
        if (selectedRegionId.value) {
          loadingCities.value = true
          try {
            cities.value = await locationService.getCitiesByRegion(selectedRegionId.value)
          } catch (e) {
            cities.value = []
          } finally {
            loadingCities.value = false
          }
        }
        return
      }

      loadingCities.value = true
      try {
        cities.value = await locationService.getCitiesByProvince(provinceId)
      } catch (e) {
        cities.value = []
      } finally {
        loadingCities.value = false
      }
    }

    const onCityChange = async (cityId) => {
      patient.barangay_id = null
      barangays.value = []

      if (!cityId) return

      loadingBarangays.value = true
      try {
        barangays.value = await locationService.getBarangays(cityId)
      } catch (e) {
        barangays.value = []
      } finally {
        loadingBarangays.value = false
      }
    }

    // ---------- Permanent address cascading ----------
    const onPermanentRegionChange = async (regionId) => {
      patient.permanent_province_id = null
      patient.permanent_city_municipality_id = null
      patient.permanent_barangay_id = null
      permanentProvinces.value = []
      permanentCities.value = []
      permanentBarangays.value = []

      if (!regionId) return

      loadingPermanentProvinces.value = true
      try {
        permanentProvinces.value = await locationService.getProvinces(regionId)
      } catch (e) {
        permanentProvinces.value = []
      } finally {
        loadingPermanentProvinces.value = false
      }

      loadingPermanentCities.value = true
      try {
        permanentCities.value = await locationService.getCitiesByRegion(regionId)
      } catch (e) {
        permanentCities.value = []
      } finally {
        loadingPermanentCities.value = false
      }
    }

    const onPermanentProvinceChange = async (provinceId) => {
      patient.permanent_city_municipality_id = null
      patient.permanent_barangay_id = null
      permanentCities.value = []
      permanentBarangays.value = []

      if (!provinceId) {
        if (permanentRegionId.value) {
          loadingPermanentCities.value = true
          try {
            permanentCities.value = await locationService.getCitiesByRegion(permanentRegionId.value)
          } catch (e) {
            permanentCities.value = []
          } finally {
            loadingPermanentCities.value = false
          }
        }
        return
      }

      loadingPermanentCities.value = true
      try {
        permanentCities.value = await locationService.getCitiesByProvince(provinceId)
      } catch (e) {
        permanentCities.value = []
      } finally {
        loadingPermanentCities.value = false
      }
    }

    const onPermanentCityChange = async (cityId) => {
      patient.permanent_barangay_id = null
      permanentBarangays.value = []

      if (!cityId) return

      loadingPermanentBarangays.value = true
      try {
        permanentBarangays.value = await locationService.getBarangays(cityId)
      } catch (e) {
        permanentBarangays.value = []
      } finally {
        loadingPermanentBarangays.value = false
      }
    }

    // ---------------- SUBMIT ----------------
    const submit = async () => {
      if (!form.value.validate()) return

      submitting.value = true
      try {
        const updateData = {
          first_name: patient.first_name,
          middle_name: patient.middle_name,
          last_name: patient.last_name,
          suffix: patient.suffix,
          birth_date: patient.birth_date,
          gender: patient.gender,
          contact_number: patient.contact_number,
          email: patient.email,
          facebook_messenger: patient.facebook_messenger,

          sitio_street: patient.sitio_street,
          barangay_id: patient.barangay_id,
          city_municipality_id: patient.city_municipality_id,
          province_id: patient.province_id,

          same_as_current_address: patient.same_as_current_address,
          permanent_sitio_street: patient.same_as_current_address
            ? null : patient.permanent_sitio_street,
          permanent_barangay_id: patient.same_as_current_address
            ? null : patient.permanent_barangay_id,
          permanent_city_municipality_id: patient.same_as_current_address
            ? null : patient.permanent_city_municipality_id,
          permanent_province_id: patient.same_as_current_address
            ? null : patient.permanent_province_id,

          purpose: patient.purpose
        }

        await patientService.updatePatient(route.params.id, updateData)
        showSnackbar('Patient updated successfully!', 'success')
        setTimeout(() => router.push(`/patients/${route.params.id}`), 1500)
      } catch (error) {
        const msg = error.response?.data?.error || error.message
        showSnackbar('Failed to update patient: ' + msg, 'error')
      } finally {
        submitting.value = false
      }
    }

    const cancel = () => router.push(`/patients/${route.params.id}`)

    const showSnackbar = (message, color = 'success') => {
      snackbar.value = { show: true, message, color }
    }

    // ---------------- LIFECYCLE ----------------
    onMounted(async () => {
      await loadRegions()
      await loadPatient()
    })

    watch(() => patient.same_as_current_address, (isSame) => {
      if (isSame) {
        patient.permanent_sitio_street = ''
        patient.permanent_barangay_id = null
        patient.permanent_city_municipality_id = null
        patient.permanent_province_id = null
        permanentRegionId.value = null
        permanentProvinces.value = []
        permanentCities.value = []
        permanentBarangays.value = []
      }
    })

    return {
      form,
      valid,
      submitting,
      dateMenu,
      loading,
      patient,
      genderOptions,
      purposeOptions,
      today,
      submit,
      cancel,
      snackbar,

      regions,
      provinces,
      cities,
      barangays,
      selectedRegionId,
      loadingRegions,
      loadingProvinces,
      loadingCities,
      loadingBarangays,
      onRegionChange,
      onProvinceChange,
      onCityChange,

      permanentRegionId,
      permanentProvinces,
      permanentCities,
      permanentBarangays,
      loadingPermanentProvinces,
      loadingPermanentCities,
      loadingPermanentBarangays,
      onPermanentRegionChange,
      onPermanentProvinceChange,
      onPermanentCityChange
    }
  }
}
</script>

<style scoped>
.patient-edit-view {
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
.info-card {
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
}

/* ─── Responsive ─── */
@media (max-width: 600px) {
  .header {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>