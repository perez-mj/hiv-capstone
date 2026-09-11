<!-- frontend/src/layouts/PatientLayout.vue -->
<template>
  <v-app>
    <!-- App Bar - Fixed at top -->
    <v-app-bar 
      :color="theme.current.value.colors.surface"
      elevation="0"
      border="b"
      class="px-2 px-sm-4 app-bar"
      height="64"
      app
      flat
    >
      <v-app-bar-nav-icon 
        variant="text"
        :color="theme.current.value.colors.primary"
        @click="toggleDrawer"
        size="40"
        class="d-md-none"
      />
      
      <!-- Brand - Responsive -->
      <div class="d-flex align-center brand-container">
        <img 
          src="@/assets/logo.svg" 
          alt="OMPH HIV CARE" 
          class="logo-icon"
        />
        <span 
          class="brand-text font-weight-bold" 
          :style="{ color: theme.current.value.colors.primary }"
        >
          OMPH HIV CARE
        </span>
      </div>
      
      <v-spacer />
      
      <div class="d-flex align-center ga-1">
        <!-- Theme Toggle -->
        <v-btn
          icon
          variant="text"
          size="small"
          @click="toggleTheme"
          :color="theme.current.value.colors.primary"
        >
          <v-icon size="20">
            {{ isDarkTheme ? 'mdi-weather-sunny' : 'mdi-weather-night' }}
          </v-icon>
        </v-btn>
        
        <!-- User Chip -->
        <v-chip
          :color="theme.current.value.colors.primary"
          variant="tonal"
          size="x-small"
          class="d-none d-sm-flex font-weight-medium"
          density="compact"
        >
          <v-icon left size="14" class="mr-1">mdi-account-circle</v-icon>
          {{ user?.username || 'Patient' }}
        </v-chip>
        
        <!-- Logout -->
        <v-btn
          icon
          variant="text"
          :color="theme.current.value.colors.error"
          @click="logout"
          size="small"
        >
          <v-icon size="20">mdi-logout</v-icon>
        </v-btn>
      </div>
    </v-app-bar>

    <!-- Navigation Drawer - Permanent on desktop, temporary on mobile -->
    <v-navigation-drawer 
      v-model="drawer" 
      app
      :permanent="!isMobile"
      :temporary="isMobile"
      :color="theme.current.value.colors.surface"
      border="r"
      width="280"
      class="sidebar-drawer"
    >
      <!-- User Profile Section -->
      <v-card :color="theme.current.value.colors.primary" flat class="pa-4 rounded-0 profile-section">
        <div class="d-flex align-center ga-3">
          <v-avatar 
            :color="theme.current.value.colors.surface" 
            size="48"
            class="flex-shrink-0"
          >
            <v-icon :color="theme.current.value.colors.primary" size="28">
              mdi-account
            </v-icon>
          </v-avatar>
          <div>
            <div class="text-subtitle-1 font-weight-bold" :style="{ color: theme.current.value.colors.surface }">
              {{ user?.username || 'Patient' }}
            </div>
            <div class="text-caption" :style="{ color: theme.current.value.colors.surface, opacity: 0.8 }">
              {{ userRole }}
            </div>
          </div>
        </div>
      </v-card>
      
      <v-divider />
      
      <!-- Navigation Items - Scrollable -->
      <div class="sidebar-scrollable">
        <v-list density="compact" class="pa-2">
          <v-list-item
            v-for="item in menuItems"
            :key="item.path"
            :to="item.path"
            @click="closeDrawerOnMobile"
            :active="isActiveRoute(item.path)"
            rounded="lg"
            class="mb-1"
            density="comfortable"
            :style="{
              backgroundColor: isActiveRoute(item.path) ? `rgba(${primaryRgb}, 0.08)` : 'transparent'
            }"
          >
            <template #prepend>
              <v-icon 
                :color="isActiveRoute(item.path) ? theme.current.value.colors.primary : undefined"
                size="22"
              >
                {{ item.icon }}
              </v-icon>
            </template>
            <v-list-item-title 
              :class="{ 'font-weight-medium': isActiveRoute(item.path) }"
              :style="{
                color: isActiveRoute(item.path) ? theme.current.value.colors.primary : undefined
              }"
            >
              {{ item.title }}
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </div>
      
      <!-- Bottom Actions - Fixed at bottom -->
      <template #append>
        <v-divider />
        <v-list density="compact" class="pa-2">
          <v-list-item 
            @click="toggleTheme"
            rounded="lg"
            density="comfortable"
            class="mb-1"
          >
            <template #prepend>
              <v-icon :color="theme.current.value.colors.primary">
                {{ isDarkTheme ? 'mdi-weather-sunny' : 'mdi-weather-night' }}
              </v-icon>
            </template>
            <v-list-item-title :style="{ color: theme.current.value.colors.primary }">
              {{ isDarkTheme ? 'Light Mode' : 'Dark Mode' }}
            </v-list-item-title>
          </v-list-item>
          
          <v-list-item 
            @click="logout"
            rounded="lg"
            density="comfortable"
          >
            <template #prepend>
              <v-icon :color="theme.current.value.colors.error">mdi-logout</v-icon>
            </template>
            <v-list-item-title :style="{ color: theme.current.value.colors.error }">
              Logout
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </template>
    </v-navigation-drawer>

    <!-- Main Content - Pushes right on desktop -->
    <v-main :style="{ backgroundColor: theme.current.value.colors.background }" class="main-content">
      <v-container 
        fluid 
        :style="{ 
          minHeight: 'calc(100vh - 64px)',
          backgroundColor: theme.current.value.colors.background 
        }"
      >
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from 'vuetify';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const theme = useTheme();
const drawer = ref(null);

// Responsive breakpoint
const isMobile = ref(window.innerWidth < 960);

// Handle resize
const handleResize = () => {
  isMobile.value = window.innerWidth < 960;
  // Auto-close drawer on mobile resize
  if (isMobile.value) {
    drawer.value = false;
  } else {
    drawer.value = null; // Let Vuetify handle permanent state
  }
};

// Lifecycle
onMounted(() => {
  window.addEventListener('resize', handleResize);
  // Set initial drawer state
  drawer.value = !isMobile.value;
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

// Computed
const user = computed(() => authStore.user);
const userRole = computed(() => user.value?.role?.toUpperCase() || 'PATIENT');
const isDarkTheme = computed(() => theme.global.name.value === 'myCustomDarkTheme');

const primaryRgb = computed(() => {
  const hex = theme.current.value.colors.primary;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '0, 0, 0';
});

const menuItems = [
  { title: 'Dashboard', icon: 'mdi-view-dashboard', path: '/patient/dashboard' },
  { title: 'Appointments', icon: 'mdi-calendar-clock', path: '/patient/appointments' },
  { title: 'Visits', icon: 'mdi-stethoscope', path: '/patient/visits' },
  { title: 'My Profile', icon: 'mdi-account', path: '/patient/profile' },
];

// Methods
const isActiveRoute = (path) => {
  return route.path === path || route.path.startsWith(path + '/');
};

const toggleDrawer = () => {
  if (isMobile.value) {
    drawer.value = !drawer.value;
  }
};

const closeDrawerOnMobile = () => {
  if (isMobile.value) {
    drawer.value = false;
  }
};

const toggleTheme = () => {
  const newTheme = isDarkTheme.value ? 'myCustomLightTheme' : 'myCustomDarkTheme';
  theme.global.name.value = newTheme;
  localStorage.setItem('theme', newTheme);
};

const logout = () => {
  authStore.logout();
  router.push('/login');
};
</script>

<style scoped>
/* ============================================
   FIXED NAVBAR STYLES
   ============================================ */
.app-bar {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  z-index: 1100 !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08) !important;
}

/* ============================================
   SIDEBAR STYLES
   ============================================ */
.sidebar-drawer {
  position: fixed !important;
  top: 64px !important;
  bottom: 0 !important;
  height: calc(100vh - 64px) !important;
  max-height: calc(100vh - 64px) !important;
  z-index: 1000 !important;
}

/* Profile section - fixed at top of sidebar */
.profile-section {
  flex-shrink: 0 !important;
}

/* Scrollable navigation area */
.sidebar-scrollable {
  flex: 1 1 auto !important;
  min-height: 0 !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
}

/* ============================================
   MAIN CONTENT - Pushed right by sidebar
   ============================================ */
.main-content {
  margin-top: 64px !important;
  min-height: calc(100vh - 64px) !important;
  padding-left: 0 !important;
}

/* Desktop: Content pushes right of sidebar */
@media (min-width: 960px) {
  .main-content {
    padding-left: 280px !important;
  }
}

/* Mobile: Full width content */
@media (max-width: 959px) {
  .main-content {
    padding-left: 0 !important;
  }
}

/* ============================================
   TRANSITIONS
   ============================================ */
.v-app-bar,
.v-navigation-drawer,
.v-main,
.v-container,
.v-card,
.v-list-item {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}

/* ============================================
   BRAND STYLES
   ============================================ */
.brand-container {
  gap: 8px;
  overflow: hidden;
  min-width: 0;
}

.logo-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  object-fit: contain;
  transition: all 0.3s ease;
}

.brand-text {
  font-size: 1.1rem;
  line-height: 1.2;
  white-space: nowrap;
  transition: all 0.3s ease;
}

/* ============================================
   RESPONSIVE - Progressive reduction
   ============================================ */
@media (max-width: 600px) {
  .logo-icon {
    width: 32px;
    height: 32px;
  }
  
  .brand-text {
    font-size: 0.9rem;
  }
}

@media (max-width: 450px) {
  .logo-icon {
    width: 28px;
    height: 28px;
  }
  
  .brand-text {
    font-size: 0.75rem;
  }
}

@media (max-width: 380px) {
  .logo-icon {
    width: 24px;
    height: 24px;
  }
  
  .brand-text {
    font-size: 0.65rem;
  }
}

@media (max-width: 320px) {
  .brand-text {
    display: none;
  }
  
  .logo-icon {
    width: 28px;
    height: 28px;
  }
}

/* ============================================
   SCROLLBAR STYLING (optional)
   ============================================ */
.sidebar-scrollable::-webkit-scrollbar {
  width: 4px;
}

.sidebar-scrollable::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-scrollable::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 4px;
}

.sidebar-scrollable::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.25);
}

/* Dark mode scrollbar */
:deep(.v-theme--dark) .sidebar-scrollable::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
}

:deep(.v-theme--dark) .sidebar-scrollable::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}
</style>