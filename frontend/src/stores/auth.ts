import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { configureClient } from '@/api/client'

const ACCESS_TOKEN_KEY = 'icarus_access_token'
const REFRESH_TOKEN_KEY = 'icarus_refresh_token'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(localStorage.getItem(ACCESS_TOKEN_KEY))
  const refreshToken = ref<string | null>(localStorage.getItem(REFRESH_TOKEN_KEY))

  const isAuthenticated = computed(() => !!accessToken.value)

  function setTokens(tokens: { access_token: string; refresh_token: string }) {
    accessToken.value = tokens.access_token
    refreshToken.value = tokens.refresh_token
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token)
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token)
  }

  function clearTokens() {
    accessToken.value = null
    refreshToken.value = null
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }

  // Wire the API client to read from this store.
  // Called once during app initialisation so the client has no direct Pinia dep.
  function bindClient(onAuthFailure: () => void) {
    configureClient({
      getAccessToken: () => accessToken.value,
      getRefreshToken: () => refreshToken.value,
      onRefreshSuccess: setTokens,
      onAuthFailure: () => {
        clearTokens()
        onAuthFailure()
      },
    })
  }

  return { accessToken, refreshToken, isAuthenticated, setTokens, clearTokens, bindClient }
})
