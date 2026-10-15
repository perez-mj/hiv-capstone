<!-- frontend/src/views/staff/ProfileView.vue -->
<template>
  <div class="profile-view">
    <!-- Page Header -->
    <div class="d-flex align-center mb-6">
      <v-btn icon variant="text" class="mr-2" @click="$router.back()">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <div>
        <h1 class="text-h5 font-weight-bold">My Profile</h1>
      </div>
    </div>

    <v-row>
      <!-- LEFT: Identity Card (only visual/identity info) -->
      <v-col cols="12" md="4">
        <v-card class="pa-6 text-center" elevation="2">
          <v-avatar
            size="120"
            :color="$vuetify.theme.current.colors.primary"
            class="mb-4"
          >
            <span class="white--text text-h3 font-weight-bold">
              {{ userInitials }}
            </span>
          </v-avatar>

          <h2 class="text-h6 font-weight-bold mb-1">
            {{ user?.username || 'User' }}
          </h2>
          <p class="text-body-2 text-medium-emphasis mb-4">
            {{ user?.email || 'No email' }}
          </p>

          <v-chip
            :color="roleColor"
            variant="flat"
            size="small"
            class="mb-4"
          >
            <v-icon start size="small">{{ roleIcon }}</v-icon>
            {{ user?.role?.toUpperCase() }}
          </v-chip>

          <v-divider class="my-4" />

          <!-- Only office + status (unique to this card) -->
          <div class="text-left">
            <div class="d-flex justify-space-between mb-2">
              <span class="text-body-2 text-medium-emphasis">Office</span>
              <span class="text-body-2 font-weight-medium">
                {{ user?.office ? formatOffice(user.office) : 'Not assigned' }}
              </span>
            </div>
            <div class="d-flex justify-space-between">
              <span class="text-body-2 text-medium-emphasis">Status</span>
              <v-chip
                :color="user?.is_active !== false ? 'success' : 'error'"
                size="x-small"
                variant="flat"
              >
                {{ user?.is_active !== false ? 'Active' : 'Inactive' }}
              </v-chip>
            </div>
          </div>
        </v-card>
      </v-col>

      <!-- RIGHT: Details -->
      <v-col cols="12" md="8">
        <!-- Security (most actionable) -->
        <v-card class="mb-4" elevation="2">
          <v-card-title class="d-flex align-center pa-4">
            <v-icon class="mr-2" color="primary">mdi-shield-account</v-icon>
            <span class="text-h6 font-weight-bold">Security</span>
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-4">
            <div class="d-flex align-center justify-space-between flex-wrap ga-3">
              <div class="d-flex align-center">
                <v-avatar color="warning" variant="tonal" size="40" class="mr-3">
                  <v-icon>mdi-lock</v-icon>
                </v-avatar>
                <div>
                  <p class="text-body-1 font-weight-medium mb-0">Password</p>
                  <p class="text-caption text-medium-emphasis mb-0">
                    Last changed: {{ formatDate(user?.password_changed_at) }}
                  </p>
                </div>
              </div>
              <v-btn
                color="primary"
                variant="tonal"
                prepend-icon="mdi-lock-reset"
                to="/change-password"
              >
                Change Password
              </v-btn>
            </div>
          </v-card-text>
        </v-card>

        <!-- Account Activity (dates only — no repeats) -->
        <v-card class="mb-4" elevation="2">
          <v-card-title class="d-flex align-center pa-4">
            <v-icon class="mr-2" color="primary">mdi-clock-outline</v-icon>
            <span class="text-h6 font-weight-bold">Account Activity</span>
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-4">
            <v-row>
              <v-col cols="12" sm="6">
                <div class="info-field">
                  <label class="text-caption text-medium-emphasis">Account Created</label>
                  <p class="text-body-1 font-weight-medium mb-0">
                    {{ formatDate(user?.created_at) }}
                  </p>
                </div>
              </v-col>
              <v-col cols="12" sm="6">
                <div class="info-field">
                  <label class="text-caption text-medium-emphasis">Last Login</label>
                  <p class="text-body-1 font-weight-medium mb-0">
                    {{ formatDate(user?.last_login) }}
                  </p>
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Danger Zone -->
        <v-card elevation="2" border>
          <v-card-title class="d-flex align-center pa-4">
            <v-icon class="mr-2" color="error">mdi-alert-outline</v-icon>
            <span class="text-h6 font-weight-bold">Session</span>
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-4">
            <div class="d-flex align-center justify-space-between flex-wrap ga-3">
              <div>
                <p class="text-body-2 font-weight-medium mb-0">Sign out of this device</p>
                <p class="text-caption text-medium-emphasis mb-0">
                  You'll need to log in again to access your account
                </p>
              </div>
              <v-btn
                color="error"
                variant="tonal"
                prepend-icon="mdi-logout"
                @click="showLogoutDialog = true"
              >
                Logout
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Logout Confirmation Dialog -->
    <ConfirmDialog
      v-model="showLogoutDialog"
      title="Confirm Logout"
      confirm-text="Logout"
      color="error"
      icon="mdi-logout"
      :loading="logoutLoading"
      @confirm="confirmLogout"
    >
      Are you sure you want to logout?
    </ConfirmDialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useSnackbar } from '@/plugins/snackbar'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

const router = useRouter()
const authStore = useAuthStore()
const snackbar = useSnackbar()

const showLogoutDialog = ref(false)
const logoutLoading = ref(false)

const user = computed(() => authStore.user)

const userInitials = computed(() => {
  const name = user.value?.username
  if (!name) return 'U'
  return name.slice(0, 2).toUpperCase()
})

const roleColor = computed(() => {
  const role = user.value?.role
  if (role === 'admin') return 'error'
  if (role === 'staff') return 'primary'
  if (role === 'patient') return 'success'
  return 'grey'
})

const roleIcon = computed(() => {
  const role = user.value?.role
  if (role === 'admin') return 'mdi-shield-crown'
  if (role === 'staff') return 'mdi-badge-account'
  if (role === 'patient') return 'mdi-account-heart'
  return 'mdi-account'
})

const formatOffice = (office) => {
  const offices = {
    testing: 'Testing Office',
    treatment: 'Treatment Office'
  }
  return offices[office] || office
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'N/A'
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const confirmLogout = async () => {
  logoutLoading.value = true
  try {
    await authStore.logout()
    snackbar.success('Logged out successfully')
    router.push('/login')
  } catch (error) {
    snackbar.error('Failed to logout: ' + (error.message || 'Unknown error'))
  } finally {
    logoutLoading.value = false
    showLogoutDialog.value = false
  }
}
</script>

<style scoped>
.profile-view {
  max-width: 1200px;
  margin: 0 auto;
}

.info-field {
  padding: 8px 0;
}

.info-field label {
  display: block;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}
</style>