<!-- frontend/src/views/staff/patients/ListView.vue -->
<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="text-h5">
            <v-icon left>mdi-account-group</v-icon>
            Patient Management
            <v-spacer></v-spacer>
            <v-btn color="primary" @click="navigateToCreate">
              <v-icon left>mdi-account-plus</v-icon>
              Add Patient
            </v-btn>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <!-- Search and Filters -->
            <v-row>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="searchQuery"
                  label="Search patients..."
                  prepend-inner-icon="mdi-magnify"
                  clearable
                  @input="debouncedSearch"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="3">
                <v-select
                  v-model="statusFilter"
                  :items="statusOptions"
                  label="Status"
                  clearable
                  @update:model-value="loadPatients"
                ></v-select>
              </v-col>
              <v-col cols="12" md="3">
                <v-select
                  v-model="yearFilter"
                  :items="yearOptions"
                  label="Enrollment Year"
                  clearable
                  @update:model-value="loadPatients"
                ></v-select>
              </v-col>
              <v-col cols="12" md="2" class="text-right">
                <v-chip class="mr-2" color="info" small>
                  Total: {{ totalPatients }}
                </v-chip>
                <v-btn color="info" @click="refresh" :loading="loading">
                  <v-icon left small>mdi-refresh</v-icon>
                  Refresh
                </v-btn>
              </v-col>
            </v-row>

            <!-- Patient Table -->
            <v-data-table
              :headers="headers"
              :items="patients"
              :loading="loading"
              :items-per-page="itemsPerPage"
              :page="currentPage"
              :items-length="totalPatients"
              @update:page="updatePage"
              @update:items-per-page="updateItemsPerPage"
            >
              <template v-slot:item.full_name="{ item }">
                <div class="d-flex align-center">
                  <v-avatar size="32" color="primary" class="mr-2">
                    <span class="text-white text-caption">
                      {{ getInitials(item) }}
                    </span>
                  </v-avatar>
                  {{ item.first_name }} {{ getMiddleInitial(item.middle_name) }}. {{ item.last_name }}
                </div>
              </template>

              <template v-slot:item.patient_facility_code="{ item }">
                <v-chip color="primary" small>
                  {{ item.patient_facility_code }}
                </v-chip>
              </template>

              <template v-slot:item.status="{ item }">
                <v-chip :color="item.status === 'treatment' ? 'success' : 'info'" small>
                  {{ item.status }}
                </v-chip>
              </template>

              <template v-slot:item.age="{ item }">
                {{ calculateAge(item.birth_date) }}
              </template>

              <template v-slot:item.enrollment_date="{ item }">
                {{ formatDate(item.enrollment_date) }}
              </template>

              <template v-slot:item.actions="{ item }">
                <v-btn icon small color="primary" @click="viewPatient(item.id)">
                  <v-icon small>mdi-eye</v-icon>
                </v-btn>
                <v-btn icon small color="info" @click="editPatient(item.id)">
                  <v-icon small>mdi-pencil</v-icon>
                </v-btn>
                <v-btn icon small color="success" @click="startEncounter(item.id)">
                  <v-icon small>mdi-test-tube</v-icon>
                </v-btn>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import patientService from '@/services/patientService'
import { useAuthStore } from '@/stores/authStore'

export default {
  name: 'PatientList',
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    
    const patients = ref([])
    const loading = ref(false)
    const searchQuery = ref('')
    const statusFilter = ref(null)
    const yearFilter = ref(null)
    const currentPage = ref(1)
    const itemsPerPage = ref(20)
    const totalPatients = ref(0)
    let searchTimeout = null

    const snackbar = ref({
      show: false,
      message: '',
      color: 'success'
    })

    const statusOptions = [
      { title: 'Testing', value: 'testing' },
      { title: 'Treatment', value: 'treatment' }
    ]

    // Generate year options (last 10 years)
    const yearOptions = computed(() => {
      const currentYear = new Date().getFullYear()
      const years = []
      for (let i = 0; i < 10; i++) {
        const year = currentYear - i
        years.push({ title: year.toString(), value: year.toString() })
      }
      return years
    })

    const headers = [
      { title: 'Name', key: 'full_name' },
      { title: 'Facility Code', key: 'patient_facility_code', align: 'center' },
      { title: 'Contact', key: 'contact_number' },
      { title: 'Age', key: 'age', align: 'center' },
      { title: 'Gender', key: 'gender', align: 'center' },
      { title: 'Status', key: 'status', align: 'center' },
      { title: 'Enrolled', key: 'enrollment_date', align: 'center' },
      { title: 'Actions', key: 'actions', align: 'center', sortable: false }
    ]

    const loadPatients = async () => {
      loading.value = true
      try {
        // Build query params
        const params = {
          page: currentPage.value,
          limit: itemsPerPage.value,
          search: searchQuery.value
        }

        // Note: The backend currently doesn't support status/year filters
        // We'll filter client-side or you can extend the backend API
        const response = await patientService.getPatients(
          params.page,
          params.limit,
          params.search
        )
        
        // Apply client-side filters
        let filteredItems = response.items || []
        
        if (statusFilter.value) {
          filteredItems = filteredItems.filter(p => p.status === statusFilter.value)
        }
        
        if (yearFilter.value) {
          filteredItems = filteredItems.filter(p => {
            if (!p.enrollment_date) return false
            const year = new Date(p.enrollment_date).getFullYear().toString()
            return year === yearFilter.value
          })
        }
        
        patients.value = filteredItems
        totalPatients.value = response.total || 0
      } catch (error) {
        showSnackbar('Failed to load patients: ' + error.message, 'error')
      } finally {
        loading.value = false
      }
    }

    const debouncedSearch = () => {
      clearTimeout(searchTimeout)
      searchTimeout = setTimeout(() => {
        currentPage.value = 1
        loadPatients()
      }, 500)
    }

    const refresh = () => {
      loadPatients()
    }

    const updatePage = (page) => {
      currentPage.value = page
      loadPatients()
    }

    const updateItemsPerPage = (items) => {
      itemsPerPage.value = items
      currentPage.value = 1
      loadPatients()
    }

    const navigateToCreate = () => {
      router.push('/patients/create')
    }

    const viewPatient = (id) => {
      router.push(`/patients/${id}`)
    }

    const editPatient = (id) => {
      router.push(`/patients/${id}/edit`)
    }

    const startEncounter = (id) => {
      const office = authStore.userOffice || 'testing'
      router.push(`/${office}/encounter/${id}`)
    }

    const getInitials = (patient) => {
      return `${patient.first_name.charAt(0)}${patient.last_name.charAt(0)}`.toUpperCase()
    }

    const getMiddleInitial = (middleName) => {
      if (!middleName) return ''
      return middleName.charAt(0).toUpperCase()
    }

    const calculateAge = (birthDate) => {
      if (!birthDate) return 'N/A'
      const today = new Date()
      const birth = new Date(birthDate)
      let age = today.getFullYear() - birth.getFullYear()
      const m = today.getMonth() - birth.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--
      }
      return age
    }

    const formatDate = (date) => {
      if (!date) return 'N/A'
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }

    const showSnackbar = (message, color = 'success') => {
      snackbar.value = { show: true, message, color }
    }

    // Watch for filter changes
    watch([statusFilter, yearFilter], () => {
      currentPage.value = 1
      loadPatients()
    })

    onMounted(() => {
      loadPatients()
    })

    return {
      patients,
      loading,
      searchQuery,
      statusFilter,
      statusOptions,
      yearFilter,
      yearOptions,
      currentPage,
      itemsPerPage,
      totalPatients,
      headers,
      loadPatients,
      debouncedSearch,
      refresh,
      updatePage,
      updateItemsPerPage,
      navigateToCreate,
      viewPatient,
      editPatient,
      startEncounter,
      getInitials,
      getMiddleInitial,
      calculateAge,
      formatDate,
      snackbar
    }
  }
}
</script>