// frontend/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('@/layouts/DefaultLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      // Default redirect based on role
      {
        path: '',
        redirect: () => {
          const authStore = useAuthStore();
          const role = authStore.userRole;
          const office = authStore.userOffice;

          if (role === 'admin') {
            return '/admin';
          } else if (role === 'staff') {
            // Land on assigned office queue by default (fallback to testing)
            return office ? `/${office}/queue` : '/testing/queue';
          } else if (role === 'patient') {
            return '/patient/dashboard';
          }
          return '/login';
        }
      },

      // Staff - Testing Office (accessible by all staff & admin)
      {
        path: 'testing/queue',
        name: 'TestingQueue',
        component: () => import('@/views/staff/testing/QueueView.vue'),
        meta: { roles: ['staff', 'admin'] }
      },
      {
        path: 'testing/encounter/:patientId?',
        name: 'TestingEncounter',
        component: () => import('@/views/staff/testing/EncounterView.vue'),
        meta: { roles: ['staff', 'admin'] }
      },
      {
        path: 'testing/history/:patientId',
        name: 'TestingHistory',
        component: () => import('@/views/staff/testing/HistoryView.vue'),
        meta: { roles: ['staff', 'admin'] }
      },

      // Staff - Treatment Office (accessible by all staff & admin)
      {
        path: 'treatment/queue',
        name: 'TreatmentQueue',
        component: () => import('@/views/staff/treatment/QueueView.vue'),
        meta: { roles: ['staff', 'admin'] }
      },
      {
        path: 'treatment/encounter/:patientId?',
        name: 'TreatmentEncounter',
        component: () => import('@/views/staff/treatment/EncounterView.vue'),
        meta: { roles: ['staff', 'admin'] }
      },
      {
        path: 'treatment/history/:patientId',
        name: 'TreatmentHistory',
        component: () => import('@/views/staff/treatment/HistoryView.vue'),
        meta: { roles: ['staff', 'admin'] }
      },

      // Staff - Shared Patient Management
      {
        path: 'patients',
        name: 'PatientList',
        component: () => import('@/views/staff/patients/ListView.vue'),
        meta: { roles: ['staff', 'admin'] }
      },
      {
        path: 'patients/create',
        name: 'PatientCreate',
        component: () => import('@/views/staff/patients/CreateView.vue'),
        meta: { roles: ['staff', 'admin'] }
      },
      {
        path: 'patients/:id',
        name: 'PatientDetail',
        component: () => import('@/views/staff/patients/DetailView.vue'),
        meta: { roles: ['staff', 'admin'] }
      },
      {
        path: 'patients/:id/edit',
        name: 'PatientEdit',
        component: () => import('@/views/staff/patients/EditView.vue'),
        meta: { roles: ['staff', 'admin'] }
      },

      // Staff - Appointments
      {
        path: 'appointments',
        name: 'AppointmentList',
        component: () => import('@/views/staff/appointments/ListView.vue'),
        meta: { roles: ['staff', 'admin'] }
      },
      {
        path: 'appointments/calendar',
        name: 'AppointmentCalendar',
        component: () => import('@/views/staff/appointments/CalendarView.vue'),
        meta: { roles: ['staff', 'admin'] }
      },
      {
        path: 'appointments/create',
        name: 'AppointmentCreate',
        component: () => import('@/views/staff/appointments/CreateView.vue'),
        meta: { roles: ['staff', 'admin'] }
      },
      {
        path: 'appointments/:id',
        name: 'AppointmentDetail',
        component: () => import('@/views/staff/appointments/DetailView.vue'),
        meta: { roles: ['staff', 'admin'] }
      },
      {
        path: 'appointments/:id/edit',
        name: 'AppointmentEdit',
        component: () => import('@/views/staff/appointments/EditView.vue'),
        meta: { roles: ['staff', 'admin'] }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/staff/ProfileView.vue'),
        meta: { roles: ['staff', 'admin', 'patient'] }
      },
      {
        path: 'change-password',
        name: 'ChangePassword',
        component: () => import('@/views/staff/ChangePasswordView.vue'),
        meta: { roles: ['staff', 'admin', 'patient'] }
      },

      // Admin Only Pages
      {
        path: 'admin',
        name: 'AdminDashboard',
        component: () => import('@/views/admin/DashboardView.vue'),
        meta: { roles: ['admin'] }
      },
      {
        path: 'admin/users',
        name: 'UserManagement',
        component: () => import('@/views/admin/UserManagementView.vue'),
        meta: { roles: ['admin'] }
      },
      {
        path: 'admin/audit-logs',
        name: 'AuditLogs',
        component: () => import('@/views/admin/AuditLogsView.vue'),
        meta: { roles: ['admin'] }
      },
      {
        path: 'admin/blockchain',
        name: 'BlockchainVerification',
        component: () => import('@/views/admin/BlockchainView.vue'),
        meta: { roles: ['admin'] }
      },
      {
        path: 'admin/backup',
        name: 'BackupRestore',
        component: () => import('@/views/admin/BackupView.vue'),
        meta: { roles: ['admin'] }
      },
      {
        path: 'admin/settings',
        name: 'AdminSettings',
        component: () => import('@/views/admin/SettingsView.vue'),
        meta: { roles: ['admin'] }
      },

      // Redirects for old routes (backward compatible)
      {
        path: 'admin/transaction-types',
        redirect: { name: 'AdminSettings', query: { tab: 'transaction-types' } },
        meta: { roles: ['admin'] }
      },
      {
        path: 'admin/appointment-settings',
        redirect: { name: 'AdminSettings', query: { tab: 'appointments' } },
        meta: { roles: ['admin'] }
      }
    ]
  },

  // Patient Portal
  {
    path: '/patient',
    component: () => import('@/layouts/PatientLayout.vue'),
    meta: { roles: ['patient'] },
    children: [
      {
        path: 'dashboard',
        name: 'PatientDashboard',
        component: () => import('@/views/patient/DashboardView.vue')
      },
      {
        path: 'appointments',
        name: 'PatientAppointments',
        component: () => import('@/views/patient/AppointmentsView.vue')
      },
      {
        path: 'visits',
        name: 'VisitHistory',
        component: () => import('@/views/patient/HistoryView.vue')
      },
      {
        path: 'profile',
        name: 'PatientProfile',
        component: () => import('@/views/patient/ProfileView.vue')
      }
    ]
  },

  // Kiosk routes (no auth required)
  {
    path: '/kiosk',
    component: () => import('@/layouts/KioskLayout.vue'),
    meta: { requiresAuth: false },
    children: [
      {
        path: '',
        name: 'KioskCheckin',
        component: () => import('@/views/kiosk/KioskQueueView.vue'),
        meta: { requiresAuth: false }
      },
      {
        path: 'display',
        name: 'KioskDisplay',
        component: () => import('@/views/kiosk/KioskDisplayView.vue'),
        meta: { requiresAuth: false }
      }
    ]
  },

  // 404
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFoundView.vue')
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

/**
 * Get the default landing route for a user based on their role.
 */
function getDefaultRoute(authStore) {
  const role = authStore.userRole;
  const office = authStore.userOffice;

  if (role === 'admin') return '/admin';
  if (role === 'staff') return office ? `/${office}/queue` : '/testing/queue';
  if (role === 'patient') return '/patient/dashboard';
  return '/login';
}

// Navigation guard
router.beforeEach(async (to) => {
  const authStore = useAuthStore();

  // Ensure auth has been checked before proceeding
  if (!authStore.isAuthChecked) {
    await authStore.checkAuth();
  }

  const requiresAuth = to.meta.requiresAuth !== false;
  const isAuthenticated = authStore.isAuthenticated;

  // Redirect unauthenticated users to login
  if (requiresAuth && !isAuthenticated) {
    return '/login';
  }

  // Redirect authenticated users away from login
  if (to.path === '/login' && isAuthenticated) {
    return getDefaultRoute(authStore);
  }

  // Role-based access control
  if (to.meta.roles) {
    const userRole = authStore.userRole;

    if (!to.meta.roles.includes(userRole)) {
      console.warn(`Access denied for role "${userRole}" on route "${to.path}"`);
      return getDefaultRoute(authStore);
    }
  }
  return true;
});

export default router;