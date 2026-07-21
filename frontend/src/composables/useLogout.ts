import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

/**
 * Clears stored auth tokens and redirects to the login screen.
 * Shared by the app header's sign-out action and by composables that need
 * to force a session end after an unrecoverable auth failure (e.g. a
 * WebSocket connection rejected for an invalid token).
 */
export function useLogout() {
  const auth = useAuthStore()
  const router = useRouter()

  return function logout() {
    auth.clearTokens()
    router.push({ name: 'login' })
  }
}
