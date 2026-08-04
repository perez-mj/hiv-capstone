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
              <v-col cols="12" md="6">
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
              <v-col cols="12" md="3" class="text-right">
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
                  {{ item.first_name }} {{ item.last_name }}
                </div>
              </template>

              <template v-slot:item.status="{ item }">
                <v-chip :color="item.status === 'treatment' ? 'success' : 'info'" small>
                  {{ item.status }}
                </v-chip>
              </template>

              <template v-slot:item.age="{ item }">
                {{ calculateAge(item.birth_date) }}
              </template>

              <template v-slot:item.created_at="{ item }">
                {{ formatDate(item.created_at) }}
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
import { ref, onMounted, watch } from 'vue'
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

    const headers = [
      { title: 'Name', key: 'full_name' },
      { title: 'Contact', key: 'contact_number' },
      { title: 'Age', key: 'age', align: 'center' },
      { title: 'Gender', key: 'gender', align: 'center' },
      { title: 'Status', key: 'status', align: 'center' },
      { title: 'Registered', key: 'created_at', align: 'center' },
      { title: 'Actions', key: 'actions', align: 'center', sortable: false }
    ]

    const loadPatients = async () => {
      loading.value = true
      try {
        const response = await patientService.getPatients(
          currentPage.value,
          itemsPerPage.value,
          searchQuery.value
        )
        patients.value = response.items || []
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
      return new Date(date).toLocaleDateString()
    }

    const showSnackbar = (message, color = 'success') => {
      snackbar.value = { show: true, message, color }
    }

    // Watch for status filter changes
    watch(statusFilter, () => {
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
      calculateAge,
      formatDate,
      snackbar
    }
  }
}
</script>