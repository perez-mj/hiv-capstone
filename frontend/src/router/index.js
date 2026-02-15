// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

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
    meta: { requiresAuth: true, adminOnly: true },
    children: [
      { path: '', redirect: '/admin/dashboard' },
      { path: 'dashboard', name: 'Dashboard', component: () => import('@/pages/admin/Dashboard.vue') },
      { path: 'patients', name: 'Patients', component: () => import('@/pages/admin/Patients.vue') },
      { path: 'enroll', name: 'Enrollment', component: () => import('@/pages/admin/Enrollment.vue') },
      { path: 'audit-security', name: 'AuditSecurity', component: () => import('@/pages/admin/AuditSecurity.vue') },
      { path: '/admin/users', name: 'UserManagement', component: () => import('@/pages/admin/UserManagement.vue'), meta: { requiresAuth: true }},
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
  // Patient routes
  {
    path: '/patient/login',
    name: 'PatientLogin',
    component: () => import('@/pages/patient/PatientLogin.vue'),
    meta: { requiresGuest: true, patientOnly: true }
  },
  {
    path: '/patient',
    component: () => import('@/layouts/PatientLayout.vue'),
    meta: { requiresPatientAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'PatientDashboard',
        component: () => import('@/pages/patient/PatientDashboard.vue')
      },
      {
        path: 'profile',
        name: 'PatientProfile',
        component: () => import('@/pages/patient/PatientProfile.vue')
      },
      {
        path: 'test-history',
        name: 'PatientTestHistory',
        component: () => import('@/pages/patient/HIVTestHistory.vue')
      },
      {
        path: 'appointments',
        name: 'PatientAppointments',
        component: () => import('@/pages/patient/PatientAppointments.vue')
      },
      {
        path: 'messages',
        name: 'PatientMessages',
        component: () => import('@/pages/patient/PatientMessages.vue')
      }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/login' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guards - SIMPLIFIED
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  console.log('🛣️ Navigation:', {
    to: to.path,
    from: from.path,
    requiresAuth: to.meta.requiresAuth,
    requiresPatientAuth: to.meta.requiresPatientAuth,
    requiresGuest: to.meta.requiresGuest
  })

  // Handle admin routes
  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      console.log('🔒 Admin auth required but not logged in, redirecting to login')
      next('/login')
      return
    }
    next()
    return
  }

  // Default - allow access
  next()
})

export default router