import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { initTheme } from './composables/useTheme'

initTheme()

const app = createApp(App)
const pinia = createPinia()

// Global error handler for uncaught exceptions
app.config.errorHandler = (err, _instance, info) => {
  console.error('[Vue] Global error handler:', { err, info })
}

app.use(pinia)
app.use(router)

// Bind the API client to the auth store once Pinia is ready.
const auth = useAuthStore()
auth.bindClient(() => {
  router.push({ name: 'login' })
})

app.mount('#app')
