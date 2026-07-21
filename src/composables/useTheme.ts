import { computed, readonly, ref } from 'vue'

type Theme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'icarus-ui-theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

const theme = ref<Theme>('light')
let isInitialized = false
let mediaQuery: MediaQueryList | null = null

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light'
  }
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

function applyTheme(nextTheme: Theme) {
  theme.value = nextTheme

  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.classList.toggle('dark', nextTheme === 'dark')
  document.documentElement.style.colorScheme = nextTheme
}

function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') {
    return null
  }

  const storedValue = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (storedValue === 'light' || storedValue === 'dark') {
    return storedValue
  }

  return null
}

function handleSystemThemeChange(event: MediaQueryListEvent) {
  const storedTheme = getStoredTheme()
  if (storedTheme) {
    return
  }

  applyTheme(event.matches ? 'dark' : 'light')
}

export function initTheme() {
  if (isInitialized) {
    return
  }

  isInitialized = true
  applyTheme(getStoredTheme() ?? getSystemTheme())

  if (typeof window === 'undefined') {
    return
  }

  mediaQuery = window.matchMedia(DARK_QUERY)
  mediaQuery.addEventListener('change', handleSystemThemeChange)
}

export function useTheme() {
  function setTheme(nextTheme: Theme) {
    applyTheme(nextTheme)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    }
  }

  function toggleTheme() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return {
    theme: readonly(theme),
    isDark: computed(() => theme.value === 'dark'),
    setTheme,
    toggleTheme,
  }
}
