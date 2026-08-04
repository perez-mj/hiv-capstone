<!-- frontend/src/layouts/PatientLayout.vue -->
<template>
  <v-app>
    <!-- Navigation Bar -->
    <v-app-bar color="primary" dark elevation="2">
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      
      <v-toolbar-title>
        <v-icon left>mdi-heart-pulse</v-icon>
        HIV Patient Portal
      </v-toolbar-title>
      
      <v-spacer />
      
      <v-chip color="success" dark small class="mr-3">
        <v-icon left small>mdi-check-circle</v-icon>
        {{ user?.username || 'Patient' }}
      </v-chip>
      
      <v-btn icon @click="logout">
        <v-icon>mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>

    <!-- Navigation Drawer -->
    <v-navigation-drawer v-model="drawer" app temporary>
      <v-list>
        <v-list-item 
          v-for="item in menuItems" 
          :key="item.path"
          :to="item.path"
          @click="drawer = false"
        >
          <v-list-item-icon>
            <v-icon>{{ item.icon }}</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>{{ item.title }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
      
      <v-divider />
      
      <v-list>
        <v-list-item @click="logout">
          <v-list-item-icon>
            <v-icon>mdi-logout</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>Logout</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <!-- Main Content -->
    <v-main>
      <v-container fluid class="pa-4">
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';

const router = useRouter();
const authStore = useAuthStore();
const drawer = ref(false);

const user = computed(() => authStore.user);

const menuItems = [
  { title: 'Dashboard', icon: 'mdi-view-dashboard', path: '/patient/dashboard' },
  { title: 'Appointments', icon: 'mdi-calendar-clock', path: '/patient/appointments' },
  { title: 'Test Results', icon: 'mdi-test-tube', path: '/patient/results' },
  { title: 'My Profile', icon: 'mdi-account', path: '/patient/profile' },
];

const logout = () => {
  authStore.logout();
  router.push('/login');
};
</script>