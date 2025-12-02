// /src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePatientAuthStore } from '@/stores/patientAuth'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/Login.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/admin/dashboard' },
      { path: 'dashboard', name: 'Dashboard', component: () => import('@/pages/admin/Dashboard.vue') },
      { path: 'patients', name: 'Patients', component: () => import('@/pages/admin/Patients.vue') },
      { path: 'enroll', name: 'Enrollment', component: () => import('@/pages/admin/Enrollment.vue') },
      { path: 'dlt-verification', name: 'DltVerification', component: () => import('@/pages/admin/DltVerification.vue') },
      { path: 'biometric', name: 'Biometric', component: () => import('@/pages/admin/Biometric.vue') },
      { path: 'audit-security', name: 'AuditSecurity', component: () => import('@/pages/admin/AuditSecurity.vue') },
      { path: 'management', name: 'Management', component: () => import('@/pages/admin/Management.vue') },
      { path: 'reports', name: 'Reports', component: () => import('@/pages/admin/Reports.vue') },
      { path: 'appointments-calendar', name: 'AppointmentsCalendar', component: () => import('@/pages/admin/AppointmentsCalendar.vue') },
      { path: 'messaging-center', name: 'MessagingCenter', component: () => import('@/pages/admin/MessagingCenter.vue') },
      {
        path: 'settings',
        component: () => import('@/pages/admin/settings/SettingsLayout.vue'),
        children: [
          { path: '', redirect: 'profile' },
          { path: 'profile', name: 'Profile', component: () => import('@/pages/admin/settings/Profile.vue') },
          { path: 'security', name: 'Security', component: () => import('@/pages/admin/settings/Security.vue') },
          { path: 'notifications', name: 'Notifications', component: () => import('@/pages/admin/settings/Notifications.vue') },
          { path: 'system', name: 'System', component: () => import('@/pages/admin/settings/System.vue') }
        ]
      }
    ]
  },
  // Patient routes - FIXED: Remove meta from parent and apply to individual routes
  {
    path: '/patient/login',
    name: 'PatientLogin',
    component: () => import('@/pages/patient/PatientLogin.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/patient',
    component: () => import('@/layouts/PatientLayout.vue'),
    children: [
      {
        path: 'dashboard',
        name: 'PatientDashboard',
        component: () => import('@/pages/patient/PatientDashboard.vue'),
        meta: { requiresPatientAuth: true }
      },
      {
        path: 'profile',
        name: 'PatientProfile',
        component: () => import('@/pages/patient/PatientProfile.vue'),
        meta: { requiresPatientAuth: true }
      },
      {
        path: 'test-history',
        name: 'PatientTestHistory',
        component: () => import('@/pages/patient/HIVTestHistory.vue'),
        meta: { requiresPatientAuth: true }
      },
      {
        path: 'appointments',
        name: 'PatientAppointments',
        component: () => import('@/pages/patient/PatientAppointments.vue'),
        meta: { requiresPatientAuth: true }
      },
      {
        path: 'messages',
        name: 'PatientMessages',
        component: () => import('@/pages/patient/PatientMessages.vue'),
        meta: { requiresPatientAuth: true }
      }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/login' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guards - UPDATED with better logic
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const patientAuthStore = usePatientAuthStore()

  console.log('🛣️ Navigation:', {
    to: to.path,
    matchedRoutes: to.matched.map(r => ({ path: r.path, meta: r.meta })),
    isPatientAuthenticated: patientAuthStore.isAuthenticated,
    isAdminAuthenticated: authStore.isAuthenticated
  })

  // Get all meta from matched routes
  const requiresPatientAuth = to.matched.some(record => record.meta.requiresPatientAuth)
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiresGuest = to.matched.some(record => record.meta.requiresGuest)

  // Patient authentication check
  if (requiresPatientAuth) {
    if (!patientAuthStore.isAuthenticated) {
      console.log('🔐 Patient auth required - redirecting to patient login')
      next('/patient/login')
      return
    }
  }

  // Admin authentication check
  if (requiresAuth) {
    if (!authStore.isAuthenticated) {
      console.log('🔐 Admin auth required - redirecting to admin login')
      next('/login')
      return
    }
  }

  // Guest route check (user should NOT be authenticated)
  if (requiresGuest) {
    // For patient guest routes
    if (to.path.includes('/patient')) {
      if (patientAuthStore.isAuthenticated) {
        console.log('👤 Patient already authenticated - redirecting to patient dashboard')
        next('/patient/dashboard')
        return
      }
    }
    // For admin guest routes
    else {
      if (authStore.isAuthenticated) {
        console.log('👤 Admin already authenticated - redirecting to admin dashboard')
        next('/admin/dashboard')
        return
      }
    }
  }

  // Allow access if no restrictions apply
  next()
})

export default router