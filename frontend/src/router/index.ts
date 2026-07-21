import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { fetchConfig } from '@/api/config'

const routes: RouteRecordRaw[] = [
  {
    // Parent route: renders the shared header/nav chrome once via
    // AuthenticatedLayout, with each page mounted through its <RouterView>.
    // `requiresAuth` on the parent applies to all children (route meta merges
    // down the matched chain), so child records don't repeat it.
    path: '/',
    component: () => import('@/layouts/AuthenticatedLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
      },
      {
        path: 'airports',
        name: 'airports',
        component: () => import('@/views/AirportsView.vue'),
      },
      {
        path: 'airports/:trackingId/timetable',
        name: 'timetable',
        component: () => import('@/views/TimetableView.vue'),
      },
      {
        path: 'radar',
        name: 'radars',
        component: () => import('@/views/RadarsView.vue'),
      },
      {
        path: 'radar/:id',
        name: 'radar-tracking',
        component: () => import('@/views/RadarTrackingView.vue'),
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/views/SettingsView.vue'),
      },
    ],
  },
  {
    path: '/auth/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { guest: true },
  },
  {
    path: '/auth/register',
    name: 'register',
    component: () => import('@/views/auth/RegisterView.vue'),
    meta: { guest: true, requiresRegistration: true },
  },
  {
    path: '/auth/recovery',
    name: 'recovery',
    component: () => import('@/views/auth/RecoveryView.vue'),
    meta: { guest: true },
  },
  {
    path: '/auth/reset',
    name: 'reset',
    component: () => import('@/views/auth/ResetView.vue'),
    meta: { guest: true },
  },
  {
    path: '/auth/initialize',
    name: 'initialize',
    component: () => import('@/views/auth/InitializeView.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Global error handler for dynamic import failures
router.onError((error) => {
  console.error('[Router] Navigation error:', error)
})

let cachedRegistrationDisabled: boolean | null = null

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // Redirect unauthenticated users away from protected routes.
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' }
  }

  // Redirect authenticated users away from guest-only routes.
  if (to.meta.guest && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }

  // Guard the register route: if registration is disabled, bounce to login.
  if (to.meta.requiresRegistration) {
    if (cachedRegistrationDisabled === null) {
      try {
        const config = await fetchConfig()
        cachedRegistrationDisabled = config.registration_disabled
      } catch {
        cachedRegistrationDisabled = true
      }
    }

    if (cachedRegistrationDisabled) {
      return { name: 'login' }
    }
  }
})

export { cachedRegistrationDisabled }
export function invalidateConfigCache() {
  cachedRegistrationDisabled = null
}

export default router
