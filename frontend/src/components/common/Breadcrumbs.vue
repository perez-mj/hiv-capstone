<!-- frontend/src/components/common/Breadcrumbs.vue -->
<template>
  <div class="breadcrumbs-wrapper">
    <v-breadcrumbs
      :items="breadcrumbItems"
      class="px-0 py-2"
      divider="/"
    >
      <template v-slot:prepend>
        <v-icon
          size="small"
          class="mr-2"
          :color="$vuetify.theme.current.dark ? 'grey-lighten-1' : 'grey-darken-2'"
        >
          mdi-home
        </v-icon>
      </template>
      <template v-slot:title="{ item }">
        <span class="text-caption font-weight-medium">
          {{ item.title }}
        </span>
      </template>
      <template v-slot:divider>
        <v-icon
          size="x-small"
          :color="$vuetify.theme.current.dark ? 'grey-darken-3' : 'grey-lighten-2'"
        >
          mdi-chevron-right
        </v-icon>
      </template>
    </v-breadcrumbs>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

// Breadcrumb mapping
const breadcrumbMap = {
  // Dashboard
  'Dashboard': { title: 'Dashboard', icon: 'mdi-view-dashboard' },
  
  // Testing Office
  'TestingQueue': { title: 'Testing Queue', icon: 'mdi-format-list-check' },
  'TestingEncounter': { title: 'Testing Encounter', icon: 'mdi-clipboard-text' },
  'TestingHistory': { title: 'Testing History', icon: 'mdi-history' },
  
  // Treatment Office
  'TreatmentQueue': { title: 'Treatment Queue', icon: 'mdi-format-list-check' },
  'TreatmentEncounter': { title: 'Treatment Encounter', icon: 'mdi-clipboard-text' },
  'TreatmentHistory': { title: 'Treatment History', icon: 'mdi-history' },
  
  // Patients
  'PatientList': { title: 'Patients', icon: 'mdi-account-multiple' },
  'PatientDetail': { title: 'Patient Details', icon: 'mdi-account' },
  'PatientCreate': { title: 'Create Patient', icon: 'mdi-account-plus' },
  'PatientEdit': { title: 'Edit Patient', icon: 'mdi-account-edit' },
  
  // Appointments
  'AppointmentList': { title: 'Appointments', icon: 'mdi-calendar-clock' },
  'AppointmentCalendar': { title: 'Calendar', icon: 'mdi-calendar' },
  
  // Admin
  'AdminDashboard': { title: 'Admin Dashboard', icon: 'mdi-shield-account' },
  'UserManagement': { title: 'User Management', icon: 'mdi-account-group' },
  'SystemSettings': { title: 'Settings', icon: 'mdi-cog' },
  'AuditLogs': { title: 'Audit Logs', icon: 'mdi-history' },
  'BlockchainVerification': { title: 'Blockchain', icon: 'mdi-link-chain' },
  'BackupRestore': { title: 'Backup & Restore', icon: 'mdi-backup-restore' },
  
  // Patient Portal
  'PatientDashboard': { title: 'Patient Dashboard', icon: 'mdi-account' },
  'PatientAppointments': { title: 'My Appointments', icon: 'mdi-calendar' },
  'PatientResults': { title: 'My Results', icon: 'mdi-file-document' },
  'PatientProfile': { title: 'My Profile', icon: 'mdi-account-edit' },
};

// Custom breadcrumb generation based on route
const breadcrumbItems = computed(() => {
  const items = [];
  const matchedRoutes = route.matched;

  // Add Home/Dashboard as first item
  items.push({
    title: 'Home',
    disabled: false,
    href: '/dashboard',
    icon: 'mdi-home',
  });

  // Process each matched route
  matchedRoutes.forEach((matchedRoute) => {
    const routeName = matchedRoute.name;
    const routePath = matchedRoute.path;

    // Skip root path
    if (routePath === '/') return;

    // Get breadcrumb info from map
    const breadcrumbInfo = breadcrumbMap[routeName];

    if (breadcrumbInfo) {
      // Check if it's the last item (current page)
      const isLast = matchedRoute === matchedRoutes[matchedRoutes.length - 1];

      // Build the breadcrumb item
      const item = {
        title: breadcrumbInfo.title,
        disabled: isLast,
        href: routePath,
        icon: breadcrumbInfo.icon,
        ...breadcrumbInfo,
      };

      // Add dynamic parameters to breadcrumb
      if (route.params && isLast) {
        // Check for patient ID in route
        if (route.params.id) {
          item.title = `${item.title} #${route.params.id}`;
        }
        if (route.params.patientId) {
          item.title = `${item.title} #${route.params.patientId}`;
        }
        // Add more dynamic parameters as needed
      }

      items.push(item);
    }
  });

  // If no items found, add current route name as fallback
  if (items.length === 1 && route.name) {
    items.push({
      title: route.name,
      disabled: true,
      href: route.path,
    });
  }

  return items;
});

// Navigate to breadcrumb
const navigateTo = (item) => {
  if (!item.disabled && item.href) {
    router.push(item.href);
  }
};
</script>

<style scoped>
.breadcrumbs-wrapper {
  background-color: transparent;
  border-radius: 8px;
  padding: 4px 0;
}

.breadcrumbs-wrapper :deep(.v-breadcrumbs) {
  padding: 4px 0;
}

.breadcrumbs-wrapper :deep(.v-breadcrumbs-item) {
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.3px;
}

.breadcrumbs-wrapper :deep(.v-breadcrumbs-item--disabled) {
  color: rgba(var(--v-theme-primary), 0.87);
  font-weight: 600;
}

.breadcrumbs-wrapper :deep(.v-breadcrumbs-item--link) {
  color: rgba(var(--v-theme-on-surface), 0.6);
  transition: color 0.2s ease;
}

.breadcrumbs-wrapper :deep(.v-breadcrumbs-item--link:hover) {
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
}

.breadcrumbs-wrapper :deep(.v-breadcrumbs-divider) {
  padding: 0 4px;
  color: rgba(var(--v-theme-on-surface), 0.3);
}

@media (max-width: 600px) {
  .breadcrumbs-wrapper :deep(.v-breadcrumbs-item) {
    font-size: 0.7rem;
  }
  
  .breadcrumbs-wrapper :deep(.v-breadcrumbs-divider) {
    padding: 0 2px;
  }
}
</style>