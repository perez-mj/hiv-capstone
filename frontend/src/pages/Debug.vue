<!-- Create a simple debug page at /debug -->
<template>
  <div class="pa-6">
    <h1>Router Debug</h1>
    <pre>{{ routeInfo }}</pre>
    <v-btn @click="$router.push('/patient/login')">Go to Patient Login</v-btn>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePatientAuthStore } from '@/stores/patientAuth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const patientAuthStore = usePatientAuthStore()

const routeInfo = computed(() => ({
  currentRoute: route.path,
  isAdminAuthenticated: authStore.isAuthenticated,
  isPatientAuthenticated: patientAuthStore.isAuthenticated,
  adminToken: authStore.token ? 'Yes' : 'No',
  patientToken: patientAuthStore.token ? 'Yes' : 'No'
}))
</script>