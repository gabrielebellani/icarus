# State Management - Icarus UI

## Panoramica Pinia

L'app usa **Pinia v3** per lo state management globale. Pinia è la libreria ufficiale di state management per Vue 3, sostitutiva di Vuex.

### Principi

- **Minimale** - Solo lo state davvero globale
- **Reattivo** - Integrazioni native con Vue 3 reactivity
- **Type-safe** - Tipizzazione completa con TypeScript
- **Modulare** - Ogni store è indipendente

### Definire uno Store

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useMyStore = defineStore('my-store', () => {
  // State
  const count = ref(0)
  const items = ref<Item[]>([])
  
  // Computed (state derivato)
  const itemCount = computed(() => items.value.length)
  
  // Actions (metodi per modificare state)
  function increment() {
    count.value++
  }
  
  function addItem(item: Item) {
    items.value.push(item)
  }
  
  // Return pubblico (quello che i componenti accedono)
  return { count, items, itemCount, increment, addItem }
})
```

### Usare uno Store

```typescript
import { useMyStore } from '@/stores/my-store'

export default {
  setup() {
    const myStore = useMyStore()
    
    // Accesso a state
    console.log(myStore.count)        // Reattivo
    console.log(myStore.itemCount)    // Computed
    
    // Chiama azioni
    myStore.increment()
    myStore.addItem({ id: 1, name: 'Item' })
    
    return { myStore }
  }
}
```

## Auth Store

**Location**: `src/stores/auth.ts`

Gestisce l'autenticazione dell'utente e i token JWT.

### State

```typescript
const accessToken = ref<string | null>(null)
const refreshToken = ref<string | null>(null)
```

### Computed

```typescript
const isAuthenticated = computed(() => !!accessToken.value)
```

### Actions

#### `setTokens(tokens)`
Salva i token da API response (dopo login/register/refresh).

```typescript
function setTokens(tokens: TokenResponse) {
  accessToken.value = tokens.access_token
  refreshToken.value = tokens.refresh_token
  // Salvati anche in localStorage per persistenza
}
```

#### `clearTokens()`
Cancella i token (logout o session expiry).

```typescript
function clearTokens() {
  accessToken.value = null
  refreshToken.value = null
  // Rimossi da localStorage
}
```

#### `bindClient(onAuthFailure)`
Connette il client HTTP allo store per auto-refresh.

```typescript
function bindClient(onAuthFailure: () => void) {
  // Il client chiamerà authStore.setTokens su 401 retry success
  // Il client chiamerà onAuthFailure se refresh fallisce
}
```

### Utilizzo

```typescript
import { useAuthStore } from '@/stores/auth'

export default {
  setup() {
    const auth = useAuthStore()
    
    // Check if logged in
    if (!auth.isAuthenticated) {
      router.push({ name: 'login' })
    }
    
    // Get token per header
    const token = auth.accessToken  // null o string
  }
}
```

## Preferences Store

**Location**: `src/stores/preferences.ts`

Gestisce le preferenze utente (display mode, temi, etc.).

### State

```typescript
const preferences = ref<UserPreferences>({
  displayMode: 'detailed',  // 'minimal' | 'detailed' | 'compact'
  theme: 'dark',
  notifications: true,
  // ...
})
```

### Actions

#### `updatePreferences(updates)`
Aggiorna le preferenze (locale e sync con backend).

```typescript
async function updatePreferences(updates: Partial<UserPreferences>) {
  preferences.value = { ...preferences.value, ...updates }
  
  // Sync con backend
  await updateUserPreferences(updates)
}
```

#### `loadPreferences()`
Carica preferenze dal backend.

```typescript
async function loadPreferences() {
  const data = await fetchUserPreferences()
  preferences.value = data
}
```

### Utilizzo

```typescript
import { usePreferencesStore } from '@/stores/preferences'

export default {
  setup() {
    const prefs = usePreferencesStore()
    
    const displayMode = computed(() => prefs.preferences.displayMode)
    
    // Change setting
    prefs.updatePreferences({ displayMode: 'minimal' })
  }
}
```

## Patterns di State Management

### Pattern: Fetch on App Init

Nello store auth, carica i token da localStorage al setup:

```typescript
// src/main.ts
import { useAuthStore } from '@/stores/auth'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

const auth = useAuthStore()
auth.hydrateFromLocalStorage()  // Carica da localStorage
auth.bindClient(() => router.push({ name: 'login' }))  // Setup client

app.use(router)
app.mount('#app')
```

### Pattern: Reactive Computed

Usa computed per derivare dati dello store:

```typescript
// In un componente
const auth = useAuthStore()

const isLoggedIn = computed(() => auth.isAuthenticated)
const canAccess = computed(() => auth.isAuthenticated && !auth.isLoading)

watch(isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    console.log('User logged in')
  }
})
```

### Pattern: Action Async

Le azioni possono essere async e modificare lo state:

```typescript
// In uno store
const loading = ref(false)

async function loadData() {
  loading.value = true
  try {
    const data = await fetchAPI()
    items.value = data
  } catch (err) {
    error.value = err
  } finally {
    loading.value = false
  }
}
```

### Pattern: Store Composition in Componente

Combina store con logica locale:

```vue
<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'

const auth = useAuthStore()
const prefs = usePreferencesStore()

const username = computed(() => auth.username)
const displayMode = computed(() => prefs.preferences.displayMode)

// Logica locale
const isFormDirty = ref(false)
</script>
```

## Persistenza dei Dati

### Auth Tokens

I token sono salvati in **localStorage** per persistenza tra sessioni:

```typescript
// setTokens()
localStorage.setItem('access_token', token.access_token)
localStorage.setItem('refresh_token', token.refresh_token)

// clearTokens()
localStorage.removeItem('access_token')
localStorage.removeItem('refresh_token')

// hydrateFromLocalStorage()
accessToken.value = localStorage.getItem('access_token')
refreshToken.value = localStorage.getItem('refresh_token')
```

### Preferenze Utente

Le preferenze sono salvate nel backend e sincronizzate:

```typescript
// loadPreferences() al app init
const prefs = await fetchUserPreferences()
preferences.value = prefs

// updatePreferences() sincronizza subito
async function updatePreferences(updates) {
  preferences.value = { ...preferences.value, ...updates }
  await updateUserPreferencesAPI(updates)
}
```

## State Reset

Quando l'utente fa logout:

```typescript
// useLogout()
function logout() {
  auth.clearTokens()
  
  // Optional: reset other stores
  // prefs.reset()
  
  router.push({ name: 'login' })
}
```

## Best Practices

### 1. Mantieni il Store Minimale
```typescript
// ✅ BENE: Solo dato globale
const isAuthenticated = computed(() => !!accessToken.value)

// ❌ MALE: State locale, dovrebbe stare nel componente
const formDirty = ref(false)
```

### 2. Usa Actions per Modifiche
```typescript
// ✅ BENE
auth.setTokens(tokens)

// ❌ MALE: Direct mutation (difficile tracciare)
auth.accessToken = token
```

### 3. Type-safe State
```typescript
// ✅ BENE: Definisci interface
interface UserPreferences {
  displayMode: 'minimal' | 'detailed' | 'compact'
  theme: 'dark' | 'light'
}

const preferences = ref<UserPreferences>({...})

// ❌ MALE: Any o object generico
const prefs = ref<any>({...})
```

### 4. Composables per Logica Riutilizzabile

Se la logica è riutilizzabile ma non globale, usa composables:

```typescript
// ❌ MALE: Logica locale in uno store
// useMyStore() { const localVariable = ref() }

// ✅ BENE: Logica locale in composable
export function useLocalLogic() {
  const localVar = ref()
  return { localVar }
}
```

### 5. Async Actions con Error Handling

```typescript
// ✅ BENE: Gestisci error e loading state
const loading = ref(false)
const error = ref<string | null>(null)

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    data.value = await api.fetch()
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// ❌ MALE: No error handling
async function fetchData() {
  data.value = await api.fetch()
}
```

## Debugging

### Vue DevTools Extension

Installa [Vue DevTools](https://devtools.vuejs.org/) per inspezionare lo store:

1. Apri Chrome DevTools → Vue tab
2. Espandi "Pinia"
3. Vedi stato di ogni store
4. Usa "Time Travel Debugging" per step through azioni

### Console Logging

```typescript
const auth = useAuthStore()
console.log('Auth store:', auth)
console.log('Tokens:', {
  access: auth.accessToken,
  refresh: auth.refreshToken,
  isAuth: auth.isAuthenticated
})
```

### Pinia Plugin per Logging

```typescript
// src/main.ts
import { createPinia } from 'pinia'

const pinia = createPinia()

pinia.use(({ store }) => {
  console.log(`Store initialized: ${store.$id}`)
})

app.use(pinia)
```

---

Prosegui con [07-COMPOSABLES.md](./07-COMPOSABLES.md) per i composables.
