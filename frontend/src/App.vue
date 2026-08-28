<!-- frontend/src/App.vue -->
<template>
  <v-app>
    <v-main>
      <router-view v-if="authReady" />
      <div v-else class="d-flex align-center justify-center" style="height: 100vh;">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      </div>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from './stores/authStore';

const authStore = useAuthStore();
const authReady = ref(false);

onMounted(async () => {
  console.log('App: Checking auth...');
  await authStore.checkAuth();
  authReady.value = true;
  console.log('App: Auth check complete', {
    isAuthenticated: authStore.isAuthenticated,
    userRole: authStore.userRole,
    userOffice: authStore.userOffice
  });
});
</script>