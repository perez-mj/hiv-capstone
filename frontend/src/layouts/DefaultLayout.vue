<!-- frontend/src/layouts/DefaultLayout.vue -->
<template>
  <v-app>
    <!-- Navigation Drawer -->
    <v-navigation-drawer
      v-model="drawer"
      app
      :color="$vuetify.theme.current.dark ? 'surface' : 'surface'"
      width="280"
      rail
      rail-width="64"
      permanent
      expand-on-hover
      @mouseenter="expandDrawer"
      @mouseleave="collapseDrawer"
    >
      <!-- Brand Section -->
      <div class="drawer-header">
        <div class="d-flex align-center px-4 py-3">
          <v-icon
            size="32"
            color="primary"
            class="mr-3"
          >
            mdi-hospital-building
          </v-icon>
          <div class="brand-text" :class="{ 'hidden': rail }">
            <div class="text-h6 font-weight-bold" :style="{ color: $vuetify.theme.current.colors.primary }" style="line-height: 1.2;">
              HIV System
            </div>
            <div class="caption text-uppercase" :style="{ color: $vuetify.theme.current.dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }" style="font-size: 10px; letter-spacing: 0.5px;">
              {{ user?.role?.toUpperCase() }} Portal
            </div>
          </div>
        </div>
        <v-divider class="mx-3"></v-divider>
      </div>

      <!-- Navigation Links -->
      <v-list
        nav
        dense
        class="pt-2"
      >
        <v-list-item
          v-for="item in menuItems"
          :key="item.to"
          :to="item.to"
          exact
          class="rounded-lg mx-2 my-1"
          :class="{ 'active-nav-item': $route.path === item.to }"
          :ripple="false"
        >
          <template v-slot:prepend>
            <v-icon 
              :color="$route.path === item.to ? 'primary' : ''"
            >
              {{ item.icon }}
            </v-icon>
          </template>
          <v-list-item-title class="font-weight-medium">
            {{ item.title }}
          </v-list-item-title>
        </v-list-item>

        <!-- Admin Section -->
        <template v-if="isAdmin">
          <v-divider class="my-3 mx-3"></v-divider>
          <div class="px-4 mb-2" :class="{ 'hidden': rail }">
            <span class="caption font-weight-bold text-uppercase" :style="{ color: $vuetify.theme.current.dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }">
              Administration
            </span>
          </div>
          
          <v-list-item
            v-for="item in adminItems"
            :key="item.to"
            :to="item.to"
            exact
            class="rounded-lg mx-2 my-1"
            :class="{ 'active-nav-item': $route.path === item.to }"
            :ripple="false"
          >
            <template v-slot:prepend>
              <v-icon :color="$route.path === item.to ? 'primary' : ''">
                {{ item.icon }}
              </v-icon>
            </template>
            <v-list-item-title>{{ item.title }}</v-list-item-title>
          </v-list-item>
        </template>
      </v-list>

      <!-- User Profile & Logout -->
      <template v-slot:append>
        <v-divider></v-divider>
        <div class="pa-3">
          <div class="d-flex align-center mb-3" :class="{ 'hidden': rail }">
            <v-avatar 
              size="40" 
              :color="$vuetify.theme.current.colors.primary" 
              class="mr-3"
            >
              <span class="white--text text-subtitle-1 font-weight-bold">
                {{ userInitials }}
              </span>
            </v-avatar>
            <div>
              <div class="text-subtitle-2 font-weight-medium" :style="{ color: $vuetify.theme.current.dark ? '#FFFFFF' : '#000000' }">
                {{ user?.fullName || user?.username }}
              </div>
              <div class="caption" :style="{ color: $vuetify.theme.current.dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }">
                {{ user?.email || 'user@example.com' }}
              </div>
            </div>
          </div>
          <v-btn
            block
            color="error"
            variant="text"
            class="rounded-lg"
            @click="logout"
          >
            <v-icon left size="20">mdi-logout</v-icon>
            <span :class="{ 'hidden': rail }">Logout</span>
          </v-btn>
        </div>
      </template>
    </v-navigation-drawer>

     <!-- App Bar -->
    <v-app-bar
      app
      :color="$vuetify.theme.current.dark ? 'surface' : 'surface'"
      :elevation="$vuetify.theme.current.dark ? 0 : 1"
      class="app-bar"
    >
      <v-app-bar-nav-icon
        @click="drawer = !drawer"
        class="d-md-none"
      ></v-app-bar-nav-icon>
      
      <v-toolbar-title 
        class="text-h6 font-weight-bold d-none d-sm-block"
        :style="{ color: $vuetify.theme.current.colors.primary }"
      >
        HIV Patient Management System
      </v-toolbar-title>
      
      <v-toolbar-title 
        class="text-h6 font-weight-bold d-sm-none"
        :style="{ color: $vuetify.theme.current.colors.primary }"
      >
        HIV System
      </v-toolbar-title>
      
      <v-spacer></v-spacer>

      <!-- Theme Toggle -->
      <v-btn
        icon
        variant="text"
        :color="$vuetify.theme.current.dark ? 'primary' : 'grey'"
        class="mr-2"
        @click="toggleTheme"
      >
        <v-icon>
          {{ $vuetify.theme.current.dark ? 'mdi-white-balance-sunny' : 'mdi-moon-waning-crescent' }}
        </v-icon>
      </v-btn>

      <!-- Quick Actions -->
      <v-btn
        icon
        variant="text"
        color="grey"
        class="mr-2"
        @click="showNotifications"
      >
        <v-badge
          color="error"
          dot
          offset-x="8"
          offset-y="8"
        >
          <v-icon>mdi-bell-outline</v-icon>
        </v-badge>
      </v-btn>

      <v-btn
        icon
        variant="text"
        color="grey"
        class="mr-2 d-none d-sm-flex"
        @click="refreshData"
      >
        <v-icon>mdi-refresh</v-icon>
      </v-btn>

      <!-- User Menu (Desktop) -->
      <v-menu
        offset-y
        transition="slide-y-transition"
        :close-on-content-click="false"
      >
        <template v-slot:activator="{ props }">
          <v-btn
            v-bind="props"
            variant="text"
            class="user-menu-btn d-none d-md-flex"
          >
            <v-avatar 
              size="36" 
              :color="$vuetify.theme.current.colors.primary" 
              class="mr-2"
            >
              <span class="white--text text-subtitle-2 font-weight-bold">
                {{ userInitials }}
              </span>
            </v-avatar>
            <span class="text-body-2 font-weight-medium mr-2" :style="{ color: $vuetify.theme.current.dark ? '#FFFFFF' : '#000000' }">
              {{ user?.fullName || user?.username }}
            </span>
            <v-icon size="20" :color="$vuetify.theme.current.dark ? '#FFFFFF' : '#000000'">mdi-chevron-down</v-icon>
          </v-btn>
        </template>
        
        <v-card 
          min-width="200" 
          class="mt-1"
          :color="$vuetify.theme.current.dark ? 'surface' : 'surface'"
        >
          <v-list>
            <v-list-item>
              <v-list-item-title class="font-weight-medium" :style="{ color: $vuetify.theme.current.dark ? '#FFFFFF' : '#000000' }">
                {{ user?.fullName || user?.username }}
              </v-list-item-title>
              <v-list-item-subtitle>{{ user?.email }}</v-list-item-subtitle>
            </v-list-item>
            <v-divider></v-divider>
            <v-list-item to="/profile">
              <v-list-item-icon>
                <v-icon size="20">mdi-account</v-icon>
              </v-list-item-icon>
              <v-list-item-title>Profile</v-list-item-title>
            </v-list-item>
            <v-divider></v-divider>
            <v-list-item @click="logout" :style="{ color: $vuetify.theme.current.colors.error }">
              <v-list-item-icon>
                <v-icon size="20" :color="error">mdi-logout</v-icon>
              </v-list-item-icon>
              <v-list-item-title>Logout</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>
      </v-menu>

      <!-- Mobile User Avatar -->
      <v-avatar
        size="32"
        :color="$vuetify.theme.current.colors.primary"
        class="d-md-none ml-2"
      >
        <span class="white--text text-subtitle-2 font-weight-bold">
          {{ userInitials }}
        </span>
      </v-avatar>
    </v-app-bar>

        <!-- Main Content -->
    <v-main class="main-content">
      <v-container fluid class="pa-4 pa-md-6">
        <!-- Breadcrumbs -->
        <Breadcrumbs class="mb-3" />
        
        <!-- Page Content -->
        <v-fade-transition mode="out-in">
          <router-view />
        </v-fade-transition>
      </v-container>
    </v-main>

    <!-- Global Snackbar -->
    <GlobalSnackbar />
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { useSnackbar } from '@/plugins/snackbar';
import Breadcrumbs from '@/components/common/Breadcrumbs.vue';
import GlobalSnackbar from '@/components/common/GlobalSnackbar.vue';
import { useTheme } from 'vuetify';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const snackbar = useSnackbar();
const theme = useTheme();

const drawer = ref(true);
const rail = ref(false);

const user = computed(() => authStore.user);
const isAdmin = computed(() => authStore.isAdmin);

const userInitials = computed(() => {
  if (user.value?.fullName) {
    return user.value.fullName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return user.value?.username?.charAt(0).toUpperCase() || 'U';
});

// Menu Items
const menuItems = [
  { title: 'Dashboard', icon: 'mdi-view-dashboard', to: '/dashboard' },
  { title: 'Patients', icon: 'mdi-account-multiple', to: '/patients' },
  { title: 'Appointments', icon: 'mdi-calendar', to: '/appointments' },
  { title: 'Reports', icon: 'mdi-chart-bar', to: '/reports' },
];

const adminItems = [
  { title: 'Dashboard', icon: 'mdi-chart-line', to: '/admin' },
  { title: 'User Management', icon: 'mdi-account-group', to: '/admin/users' },
  { title: 'System Settings', icon: 'mdi-cog', to: '/admin/settings' },
  { title: 'Audit Logs', icon: 'mdi-history', to: '/admin/audit-logs' },
  { title: 'Blockchain', icon: 'mdi-shield-key', to: '/admin/blockchain' },
  { title: 'Backup & Restore', icon: 'mdi-backup-restore', to: '/admin/backup' },
];

// Toggle theme
const toggleTheme = () => {
  const newTheme = theme.current.value.dark ? 'myCustomLightTheme' : 'myCustomDarkTheme';
  theme.change(newTheme);
  localStorage.setItem('theme', newTheme);
  snackbar.info(`Switched to ${newTheme.includes('Dark') ? 'Dark' : 'Light'} mode`);
};

// Drawer expand/collapse
const expandDrawer = () => {
  if (window.innerWidth >= 1264) {
    rail.value = false;
  }
};

const collapseDrawer = () => {
  if (window.innerWidth >= 1264) {
    rail.value = true;
  }
};

// Actions
const logout = async () => {
  try {
    await authStore.logout();
    snackbar.success('Logged out successfully');
    router.push('/login');
  } catch (error) {
    snackbar.error('Failed to logout: ' + (error.message || 'Unknown error'));
  }
};

const showNotifications = () => {
  snackbar.info('Notifications feature coming soon');
};

const refreshData = () => {
  snackbar.info('Refreshing data...');
  // Implement refresh logic here
};

// Responsive drawer state
onMounted(() => {
  // Load saved theme
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    theme.global.name.value = savedTheme;
  }

  const handleResize = () => {
    if (window.innerWidth < 1264) {
      drawer.value = false;
      rail.value = false;
    } else {
      drawer.value = true;
      rail.value = true;
    }
  };

  handleResize();
  window.addEventListener('resize', handleResize);

  return () => {
    window.removeEventListener('resize', handleResize);
  };
});
</script>

<style scoped>
.drawer-header {
  transition: all 0.2s ease;
}

.brand-text {
  transition: opacity 0.2s ease;
  white-space: nowrap;
}

.brand-text.hidden {
  opacity: 0;
  width: 0;
}

/* Navigation Items */
.v-list-item {
  transition: all 0.2s ease;
  min-height: 40px;
}

.v-list-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.04);
}

.active-nav-item {
  background-color: rgba(var(--v-theme-primary), 0.08) !important;
}

.active-nav-item .v-icon {
  color: rgb(var(--v-theme-primary));
}

/* App Bar */
.app-bar {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.user-menu-btn {
  text-transform: none;
  letter-spacing: 0;
}

/* Main Content */
.main-content {
  background-color: rgb(var(--v-theme-background));
  min-height: calc(100vh - 64px);
}

/* Responsive Adjustments */
@media (max-width: 600px) {
  .v-container {
    padding: 12px !important;
  }
}

/* Scrollbar Styling */
.v-navigation-drawer::-webkit-scrollbar {
  width: 4px;
}

.v-navigation-drawer::-webkit-scrollbar-track {
  background: transparent;
}

.v-navigation-drawer::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-primary), 0.15);
  border-radius: 2px;
}

.v-navigation-drawer::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--v-theme-primary), 0.25);
}

/* Animations */
.v-fade-transition {
  transition: opacity 0.15s ease;
}

/* Accessibility */
.v-list-item:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
}
</style>