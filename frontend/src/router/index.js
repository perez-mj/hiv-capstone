// frontend/src/router/index.js
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
    meta: { requiresAuth: true, allowedRoles: ['ADMIN', 'NURSE'] },
    children: [
      { path: '', redirect: '/admin/dashboard' },
      { path: 'dashboard', name: 'Dashboard', component: () => import('@/pages/admin/Dashboard.vue') },
      { path: 'patients', name: 'Patients', component: () => import('@/pages/admin/Patients.vue') },
      { path: 'enroll', name: 'Enrollment', component: () => import('@/pages/admin/Enrollment.vue') },
      { path: 'audit-security', name: 'AuditSecurity', component: () => import('@/pages/admin/AuditSecurity.vue') },
      { path: 'users', name: 'UserManagement', component: () => import('@/pages/admin/UserManagement.vue'), meta: { allowedRoles: ['ADMIN'] } },
      { path: 'patients/:id', name: 'PatientDetails', component: () => import('@/pages/admin/PatientDetails.vue') },
      { path: 'appointments-calendar', name: 'AppointmentsCalendar', component: () => import('@/pages/admin/AppointmentsCalendar.vue') },
      { path: 'messaging-center', name: 'MessagingCenter', component: () => import('@/pages/admin/MessagingCenter.vue') },
      { path: 'kiosks', name: 'KioskDevices', component: () => import('@/pages/admin/KioskDevices.vue'), meta: { requiresAuth: true, allowedRoles: ['ADMIN'] } },
    ]
  },
  {
    path: '/patient',
    component: () => import('@/layouts/PatientLayout.vue'),
    meta: { requiresAuth: true, allowedRoles: ['PATIENT'] },
    children: [
      { path: '', redirect: '/patient/dashboard' },
      
      // Dashboard
      {
        path: 'dashboard',
        name: 'PatientDashboard',
        component: () => import('@/pages/patient/PatientDashboard.vue'),
        meta: { title: 'Dashboard' }
      },
      
      // Appointments
      {
        path: 'appointments',
        name: 'PatientAppointments',
        component: () => import('@/pages/patient/PatientAppointments.vue'),
        meta: { title: 'Appointments' }
      },
      
      // HISTORY
      {
        path: 'history',
        name: 'PatientHistory',
        component: () => import('@/pages/patient/PatientHistory.vue'),
        meta: { title: 'History' }
      },
      
      // PROFILE
      {
        path: 'profile',
        name: 'PatientProfile',
        component: () => import('@/pages/patient/PatientProfile.vue'),
        meta: { title: 'My Profile' }
      },
      
      // Messages
      {
        path: 'messages',
        name: 'PatientMessages',
        component: () => import('@/pages/patient/PatientMessages.vue'),
        meta: { title: 'Messages' }
      }
      
      // REMOVED: ChangePassword route - comment out or delete
      // {
      //   path: 'change-password',
      //   name: 'PatientChangePassword',
      //   component: () => import('@/pages/patient/ChangePassword.vue'),
      //   meta: { title: 'Change Password' }
      // }
    ]
  },
  // Kiosk routes (public)
  {
    path: '/kiosk/display',
    name: 'QueueDisplay',
    component: () => import('@/pages/kiosk/QueueDisplay.vue'),
    meta: { layout: 'empty', requiresGuest: true }
  },
  { path: '/:pathMatch(.*)*', redirect: '/login' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guards
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  console.log('🛣️ Navigation:', {
    to: to.path,
    from: from.path,
    requiresAuth: to.meta.requiresAuth,
    requiresGuest: to.meta.requiresGuest,
    allowedRoles: to.meta.allowedRoles
  })

  // Set page title
  if (to.meta.title) {
    document.title = `${to.meta.title} - HIV Patient Management System`
  }

  // Handle guest routes (login page)
  if (to.meta.requiresGuest) {
    // If already authenticated, redirect based on role
    if (authStore.isAuthenticated) {
      console.log('🔒 Already authenticated, redirecting based on role:', authStore.userRole)

      if (authStore.userRole === 'PATIENT') {
        next('/patient/dashboard')
      } else {
        next('/admin/dashboard')
      }
      return
    }
    next()
    return
  }

  // Handle protected routes
  if (to.meta.requiresAuth) {
    // Check if authenticated
    if (!authStore.isAuthenticated) {
      console.log('🔒 Auth required but not logged in, redirecting to login')
      next('/login')
      return
    }

    // Check role-based access
    if (to.meta.allowedRoles && !to.meta.allowedRoles.includes(authStore.userRole)) {
      console.log('🔒 Role not allowed:', authStore.userRole, 'Expected:', to.meta.allowedRoles)

      // Redirect to appropriate dashboard based on role
      if (authStore.userRole === 'PATIENT') {
        next('/patient/dashboard')
      } else {
        next('/admin/dashboard')
      }
      return
    }

    next()
    return
  }

  // Default - allow access
  next()
})

export default router