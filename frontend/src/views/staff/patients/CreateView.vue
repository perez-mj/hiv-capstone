<!-- frontend/src/views/staff/patients/CreateView.vue -->
<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="text-h5">
            <v-icon left>mdi-account-plus</v-icon>
            Add New Patient
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <v-form ref="form" v-model="valid">
              <!-- ==================== PERSONAL INFO ==================== -->
              <div class="text-subtitle-1 font-weight-bold mb-3">
                Personal Information
              </div>
              <v-row>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="patient.first_name"
                    label="First Name *"
                    required
                    :rules="[v => !!v || 'First name is required']"
                    outlined
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="patient.middle_name"
                    label="Middle Name"
                    outlined
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="patient.last_name"
                    label="Last Name *"
                    required
                    :rules="[v => !!v || 'Last name is required']"
                    outlined
                  />
                </v-col>

                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="patient.suffix"
                    label="Suffix"
                    hint="Jr., Sr., III, etc."
                    persistent-hint
                    outlined
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
                        required
                        :rules="[v => !!v || 'Date of birth is required']"
                        v-bind="props"
                        outlined
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
                    required
                    :rules="[v => !!v || 'Gender is required']"
                    outlined
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="patient.contact_number"
                    label="Contact Number *"
                    required
                    :rules="[
                      v => !!v || 'Contact number is required',
                      v => /^[0-9+\-\s()]{7,20}$/.test(v) || 'Invalid contact number'
                    ]"
                    hint="Must be unique — used as patient identifier"
                    persistent-hint
                    outlined
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="patient.email"
                    label="Email"
                    type="email"
                    :rules="[
                      v => !v || /.+@.+\..+/.test(v) || 'Invalid email'
                    ]"
                    hint="Optional — used for notifications if no portal account"
                    persistent-hint
                    outlined
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="patient.facebook_messenger"
                    label="Facebook / Messenger"
                    prepend-inner-icon="mdi-facebook"
                    outlined
                  />
                </v-col>
              </v-row>

              <v-divider class="my-4" />

              <!-- ==================== CURRENT ADDRESS ==================== -->
              <div class="text-subtitle-1 font-weight-bold mb-3">
                Current Address
              </div>
              <v-row>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="selectedRegionId"
                    :items="regions"
                    item-title="name"
                    item-value="id"
                    label="Region"
                    :loading="loadingRegions"
                    outlined
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
                    outlined
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
                    outlined
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
                    outlined
                  />
                </v-col>

                <v-col cols="12">
                  <v-text-field
                    v-model="patient.sitio_street"
                    label="House No. / Street / Purok / Sitio"
                    outlined
                  />
                </v-col>
              </v-row>

              <!-- ==================== PERMANENT ADDRESS ==================== -->
              <v-divider class="my-4" />

              <div class="d-flex align-center mb-3">
                <div class="text-subtitle-1 font-weight-bold">
                  Permanent Address
                </div>
                <v-spacer></v-spacer>
                <v-checkbox
                  v-model="patient.same_as_current_address"
                  label="Same as current address"
                  color="primary"
                  density="compact"
                  hide-details
                  class="mt-0"
                />
              </div>

              <template v-if="!patient.same_as_current_address">
                <v-row>
                  <v-col cols="12" md="6">
                    <v-select
                      v-model="permanentRegionId"
                      :items="regions"
                      item-title="name"
                      item-value="id"
                      label="Region"
                      :loading="loadingRegions"
                      outlined
                      clearable
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
                      outlined
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
                      outlined
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
                      outlined
                    />
                  </v-col>

                  <v-col cols="12">
                    <v-text-field
                      v-model="patient.permanent_sitio_street"
                      label="House No. / Street / Purok / Sitio"
                      outlined
                    />
                  </v-col>
                </v-row>
              </template>

              <v-alert
                v-else
                type="info"
                variant="tonal"
                density="compact"
                class="mt-2"
              >
                Permanent address will mirror the current address.
              </v-alert>

              <v-divider class="my-4" />

              <!-- ==================== ENROLLMENT ==================== -->
              <div class="text-subtitle-1 font-weight-bold mb-3">
                Enrollment Information
              </div>
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    :model-value="today"
                    label="Enrollment Date"
                    prepend-inner-icon="mdi-calendar"
                    readonly
                    outlined
                    hint="Auto-set to today's date by the server"
                    persistent-hint
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-select
                    v-model="patient.purpose"
                    :items="purposeOptions"
                    item-title="title"
                    item-value="value"
                    label="Purpose *"
                    required
                    :rules="[v => !!v || 'Purpose is required']"
                    outlined
                    hint="Choose the enrollment purpose"
                    persistent-hint
                  />
                </v-col>
              </v-row>

              <v-divider class="my-4" />

              <!-- ==================== PORTAL ACCESS ==================== -->
              <div class="text-subtitle-1 font-weight-bold mb-3">
                Portal Access
              </div>
              <v-checkbox
                v-model="createPortalAccount"
                label="Create patient portal account"
                color="primary"
                hint="Requires a unique username, email, and password of at least 8 characters"
                persistent-hint
              />

              <v-row v-if="createPortalAccount">
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="portalCredentials.username"
                    label="Username *"
                    required
                    :rules="[
                      v => !!v || 'Username is required',
                      v => v.length >= 3 || 'Minimum 3 characters',
                      v => /^[a-zA-Z0-9_.-]+$/.test(v) || 'Only letters, numbers, _ . - allowed'
                    ]"
                    outlined
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="portalCredentials.email"
                    label="Email *"
                    type="email"
                    required
                    :rules="[
                      v => !!v || 'Email is required',
                      v => /.+@.+\..+/.test(v) || 'Invalid email'
                    ]"
                    hint="Used for portal login and notifications"
                    persistent-hint
                    outlined
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="portalCredentials.password"
                    label="Password *"
                    type="password"
                    required
                    :rules="[
                      v => !!v || 'Password is required',
                      v => v.length >= 8 || 'Minimum 8 characters'
                    ]"
                    outlined
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="portalCredentials.confirmPassword"
                    label="Confirm Password *"
                    type="password"
                    required
                    :rules="[
                      v => !!v || 'Please confirm the password',
                      v => v === portalCredentials.password || 'Passwords do not match'
                    ]"
                    outlined
                  />
                </v-col>
              </v-row>

              <v-row>
                <v-col cols="12" class="text-right">
                  <v-btn color="error" variant="text" @click="cancel">
                    Cancel
                  </v-btn>
                  <v-btn
                    color="primary"
                    :loading="submitting"
                    :disabled="!valid"
                    class="ml-2"
                    @click="submit"
                  >
                    <v-icon left>mdi-check</v-icon>
                    Save Patient
                  </v-btn>
                </v-col>
              </v-row>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="4000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script>
import { ref, reactive, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import patientService from '@/services/patientService'
import locationService from '@/services/locationService'

export default {
  name: 'PatientCreate',
  setup() {
    const router = useRouter()
    const form = ref(null)
    const valid = ref(false)
    const submitting = ref(false)
    const dateMenu = ref(false)
    const createPortalAccount = ref(false)

    const today = new Date().toISOString().split('T')[0]

    // Patient fields — match the Patient model exactly.
    // NOTE: `status` is intentionally NOT here. It is derived server-side
    // (new records default to 'testing' via the model hook). The UI no
    // longer lets staff set it directly.
    const patient = reactive({
      // Personal
      first_name: '',
      middle_name: '',
      last_name: '',
      suffix: '',
      birth_date: '',
      gender: '',
      contact_number: '',
      email: '',
      facebook_messenger: '',

      // Current address
      sitio_street: '',
      barangay_id: null,
      city_municipality_id: null,
      province_id: null,

      // Permanent address
      same_as_current_address: true,
      permanent_sitio_street: '',
      permanent_barangay_id: null,
      permanent_city_municipality_id: null,
      permanent_province_id: null,

      // Enrollment — purpose is constrained to testing | treatment
      purpose: 'testing'
    })

    // Portal (User) fields — only sent when createPortalAccount is true
    const portalCredentials = reactive({
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    })

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

    const snackbar = ref({ show: false, message: '', color: 'success' })

    const genderOptions = [
      { title: 'Male', value: 'male' },
      { title: 'Female', value: 'female' },
      { title: 'Other', value: 'other' }
    ]

    // Purpose is restricted to exactly two values.
    const purposeOptions = [
      { title: 'Testing', value: 'testing' },
      { title: 'Treatment', value: 'treatment' }
    ]

    // Clear portal credentials when the checkbox is unchecked
    watch(createPortalAccount, (enabled) => {
      if (!enabled) {
        portalCredentials.username = ''
        portalCredentials.email = ''
        portalCredentials.password = ''
        portalCredentials.confirmPassword = ''
      }
    })

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
            cities.value = await locationService.getCitiesByRegion(
              selectedRegionId.value
            )
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
            permanentCities.value = await locationService.getCitiesByRegion(
              permanentRegionId.value
            )
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
        const payload = { ...patient }

        // Strip permanent-address fields when mirroring current address —
        // the model hook will copy them from current anyway.
        if (payload.same_as_current_address) {
          delete payload.permanent_sitio_street
          delete payload.permanent_barangay_id
          delete payload.permanent_city_municipality_id
          delete payload.permanent_province_id
        }

        if (createPortalAccount.value) {
          payload.create_portal_account = true
          payload.username = portalCredentials.username
          payload.email = portalCredentials.email
          payload.password = portalCredentials.password
        }

        await patientService.createPatient(payload)
        showSnackbar('Patient created successfully!', 'success')
        setTimeout(() => router.push('/patients'), 1500)
      } catch (error) {
        const msg = error.response?.data?.error || error.message
        showSnackbar('Failed to create patient: ' + msg, 'error')
      } finally {
        submitting.value = false
      }
    }

    const cancel = () => router.push('/patients')

    const showSnackbar = (message, color = 'success') => {
      snackbar.value = { show: true, message, color }
    }

    onMounted(loadRegions)

    return {
      // form state
      form,
      valid,
      submitting,
      dateMenu,
      patient,
      portalCredentials,
      createPortalAccount,
      genderOptions,
      purposeOptions,
      today,
      submit,
      cancel,
      snackbar,

      // current address
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

      // permanent address
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