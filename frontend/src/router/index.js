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
      // Staff & Admin Dashboard
      {
        path: '',
        redirect: '/dashboard'
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/staff/DashboardView.vue'),
        meta: { roles: ['staff', 'admin'] }
      },

      // Staff - Testing Office
      {
        path: 'testing/queue',
        name: 'TestingQueue',
        component: () => import('@/views/staff/testing/QueueView.vue'),
        meta: { roles: ['staff', 'admin'], office: ['testing'] }
      },
      {
        path: 'testing/encounter/:patientId?',
        name: 'TestingEncounter',
        component: () => import('@/views/staff/testing/EncounterView.vue'),
        meta: { roles: ['staff', 'admin'], office: ['testing'] }
      },
      {
        path: 'testing/history/:patientId',
        name: 'TestingHistory',
        component: () => import('@/views/staff/testing/HistoryView.vue'),
        meta: { roles: ['staff', 'admin'] }
      },

      // Staff - Treatment Office
      {
        path: 'treatment/queue',
        name: 'TreatmentQueue',
        component: () => import('@/views/staff/treatment/QueueView.vue'),
        meta: { roles: ['staff', 'admin'], office: ['treatment'] }
      },
      {
        path: 'treatment/encounter/:patientId?',
        name: 'TreatmentEncounter',
        component: () => import('@/views/staff/treatment/EncounterView.vue'),
        meta: { roles: ['staff', 'admin'], office: ['treatment'] }
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
        path: 'patients/:id',
        name: 'PatientDetail',
        component: () => import('@/views/staff/patients/DetailView.vue'),
        meta: { roles: ['staff', 'admin'] }
      },
      {
        path: 'patients/create',
        name: 'PatientCreate',
        component: () => import('@/views/staff/patients/CreateView.vue'),
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
        path: 'appointments/:id/edit',
        name: 'AppointmentEdit',
        component: () => import('@/views/staff/appointments/EditView.vue'),
        meta: { roles: ['staff', 'admin'] }
      },
      {
        path: 'appointments/:id',
        name: 'AppointmentDetail',
        component: () => import('@/views/staff/appointments/DetailView.vue'),
        meta: { roles: ['staff', 'admin'] }
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
        path: 'admin/settings',
        name: 'SystemSettings',
        component: () => import('@/views/admin/SettingsView.vue'),
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
        path: 'admin/transaction-types',
        name: 'TransactionTypes',
        component: () => import('@/views/admin/TransactionTypesView.vue'),
        meta: { roles: ['admin'] }
      },
      {
        path: 'admin/appointment-settings',
        name: 'AppointmentSettings',
        component: () => import('@/views/admin/AppointmentSettingsView.vue'),
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
        component: () => import('@/views/patient/DashboardView.vue'),
      },
      {
        path: 'appointments',
        name: 'PatientAppointments',
        component: () => import('@/views/patient/AppointmentsView.vue'),
      },
      {
        path: 'results',
        name: 'PatientResults',
        component: () => import('@/views/patient/ResultsView.vue'),
      },
      {
        path: 'profile',
        name: 'PatientProfile',
        component: () => import('@/views/patient/ProfileView.vue'),
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
        component: () => import('@/views/kiosk/KioskCheckinView.vue'),
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

// FIXED: Navigation guard without deprecated next() callback
router.beforeEach((to) => {
  const authStore = useAuthStore();
  const requiresAuth = to.meta.requiresAuth !== false;
  const isAuthenticated = authStore.isAuthenticated;

  if (requiresAuth && !isAuthenticated) {
    return '/login';
  }

  if (to.meta.roles && !to.meta.roles.includes(authStore.userRole)) {
    if (authStore.userRole === 'admin') {
      return '/admin';
    } else if (authStore.userRole === 'staff') {
      return '/dashboard';
    } else if (authStore.userRole === 'patient') {
      return '/patient/dashboard';
    } else {
      return '/login';
    }
  }

  if (to.meta.office && !to.meta.office.includes(authStore.userOffice) && authStore.userRole !== 'admin') {
    return `/${authStore.userOffice}/queue`;
  }

  return true;
});

export default router;