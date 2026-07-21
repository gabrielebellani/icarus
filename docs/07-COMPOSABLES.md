# Composables - Icarus UI

## Cos'è un Composable

Un **composable** è una Vue 3 function che utilizza Composition API per incapsulare logica riutilizzabile. È il meccanismo di riuso logic in Vue 3.

### Struttura Base

```typescript
export function useMyComposable() {
  // State reattivo
  const count = ref(0)
  
  // Computed
  const doubleCount = computed(() => count.value * 2)
  
  // Functions
  function increment() {
    count.value++
  }
  
  // Return interface pubblica
  return {
    count,
    doubleCount,
    increment
  }
}
```

### Utilizzo in Componente

```vue
<script setup lang="ts">
import { useMyComposable } from '@/composables/useMyComposable'

const { count, doubleCount, increment } = useMyComposable()
</script>

<template>
  <div>
    Count: {{ count }}
    Double: {{ doubleCount }}
    <button @click="increment">Increment</button>
  </div>
</template>
```

## Composables nell'App

### 1. useAsyncPageState

**Location**: `src/composables/useAsyncPageState.ts`

**Scopo**: Gestire il ciclo di vita di caricamento di una pagina (loading → ready → error).

**Type Signature**:
```typescript
type AsyncPageState = 'loading' | 'ready' | 'error'

interface AsyncPageStateResult {
  state: Ref<AsyncPageState>
  error: Ref<string>
  run: (fn: () => Promise<void>) => void
  retry: () => Promise<void>
}

export function useAsyncPageState(
  errorMessage: string
): AsyncPageStateResult
```

**Usage**:
```typescript
const { state, error, run, retry } = useAsyncPageState(
  'Failed to load data'
)

// Esegui operazione asincrona
run(async () => {
  // Setta state a 'loading'
  const data = await fetchData()
  // Se succede, setta state a 'ready'
  // Se errore, setta state a 'error'
})
```

**Utilizzo in Template**:
```vue
<PageSpinner v-if="state === 'loading'" />
<PageError v-else-if="state === 'error'" :message="error" @retry="retry" />
<div v-else>{{ data }}</div>
```

**Vantaggio**: Centralizza il pattern di loading/error/retry senza duplicazione.

### 2. useLogout

**Location**: `src/composables/useLogout.ts`

**Scopo**: Centralizzare la logica di logout.

**Type Signature**:
```typescript
export function useLogout() {
  function logout(): void
  return { logout }
}
```

**Implementazione**:
```typescript
export function useLogout() {
  const router = useRouter()
  const auth = useAuthStore()
  
  function logout() {
    auth.clearTokens()  // Cancella token dallo store
    router.push({ name: 'login' })  // Redirige
  }
  
  return { logout }
}
```

**Utilizzo**:
```typescript
const { logout } = useLogout()

// In handlers
@click="logout"
```

**Vantaggio**: Singola source of truth per logout (evita duplicazione in 6+ viste).

### 3. useAppChrome

**Location**: `src/composables/useAppChrome.ts`

**Scopo**: Controllare la visibilità dell'AppHeader globale (per fullscreen views).

**Type Signature**:
```typescript
interface AppChromeResult {
  isChromeHidden: Ref<boolean>
}

export function useAppChrome(): AppChromeResult
```

**Implementazione** (Singleton):
```typescript
const isChromeHidden = ref(false)

export function useAppChrome() {
  return {
    isChromeHidden
  }
}
```

**Utilizzo in Fullscreen Views**:
```typescript
const { isChromeHidden } = useAppChrome()
const isFullscreen = ref(false)

// Sincronizza fullscreen state con header visibility
watch(isFullscreen, (fullscreen) => {
  isChromeHidden.value = fullscreen
})

// Cleanup al unmount
onUnmounted(() => {
  isChromeHidden.value = false
})
```

**Utilizzo in Layout**:
```vue
<!-- src/layouts/AuthenticatedLayout.vue -->
<template>
  <AppHeader v-show="!isChromeHidden" />
  <RouterView />
</template>
```

**Vantaggio**: Coordina header visibility tra view e layout senza prop drilling.

### 4. useRadarSocket

**Location**: `src/composables/useRadarSocket.ts`

**Scopo**: Gestire connessione WebSocket per aggiornamenti radar real-time.

**Type Signature**:
```typescript
interface RadarSocketOptions {
  radarId: string
  onAuthFailure?: () => void
}

interface RadarSocketResult {
  connectionState: Ref<'connecting' | 'open' | 'error' | 'closed'>
  aircraft: Ref<RadarAircraft[]>
  error: Ref<string | null>
  connect: () => void
  disconnect: () => void
}

export function useRadarSocket(options: RadarSocketOptions): RadarSocketResult
```

**Utilizzo**:
```typescript
const { connectionState, aircraft, error } = useRadarSocket({
  radarId: route.params.id,
  onAuthFailure: logout
})

// Reattivo: aircraft si aggiorna ad ogni messaggio WebSocket
// connectionState riflette lo stato della connessione
```

**Cleanup Automatico**:
Il composable gestisce automatically:
- Connessione al mount
- Disconnessione all'unmount
- Riconnessione su errore
- 401 handling via callback

### 5. useTimetable

**Location**: `src/composables/useTimetable.ts`

**Scopo**: Gestire il fetch e la paginazione della timetable di un aeroporto.

**Type Signature**:
```typescript
interface TimetableOptions {
  trackingId: string
  onAuthFailure?: () => void
}

interface TimetableResult {
  arrivals: Ref<TimetableEntry[]>
  departures: Ref<TimetableEntry[]>
  arrivalsLoading: Ref<boolean>
  departuresLoading: Ref<boolean>
  loadArrivals: () => Promise<void>
  loadDepartures: () => Promise<void>
}

export function useTimetable(options: TimetableOptions): TimetableResult
```

**Utilizzo**:
```typescript
const { arrivals, departures, arrivalsLoading, loadArrivals } = useTimetable({
  trackingId: route.params.trackingId,
  onAuthFailure: logout
})

// Carica tab on demand
await loadArrivals()
```

**Vantaggio**: Lazy loading dei tab (non carica tutti i dati al mount).

### 6. useAircraftCarousel

**Location**: `src/composables/useAircraftCarousel.ts`

**Scopo**: Gestire carousel di aeromobili (navigation, pagination).

**Utilizzo Tipico**:
```typescript
const { currentIndex, aircraft, nextAircraft, prevAircraft } = useAircraftCarousel(aircraftList)

// In template
Aircraft {{ currentIndex + 1 }} / {{ aircraft.length }}
<button @click="nextAircraft">Next</button>
```

### 7. useApiRequestsChart

**Location**: `src/composables/useApiRequestsChart.ts`

**Scopo**: Fetch dati per grafico storico delle richieste API.

**Utilizzo**:
```typescript
const { chartData, isLoading } = useApiRequestsChart()

// Usa in grafico component
```

## Pattern di Composables

### Pattern 1: Stato e Azioni Semplici

```typescript
export function useCounter(initial = 0) {
  const count = ref(initial)
  
  const increment = () => count.value++
  const decrement = () => count.value--
  const reset = () => count.value = initial
  
  return { count, increment, decrement, reset }
}
```

### Pattern 2: Azioni Asincrone

```typescript
export function useApiData(url: string) {
  const data = ref(null)
  const loading = ref(false)
  const error = ref(null)
  
  async function fetch() {
    loading.value = true
    error.value = null
    try {
      data.value = await api.get(url)
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }
  
  // Auto-fetch al mount
  onMounted(() => fetch())
  
  return { data, loading, error, fetch }
}
```

### Pattern 3: Reactive Watch

```typescript
export function useFormState(initialValues) {
  const form = reactive(initialValues)
  const isDirty = computed(() => {
    return JSON.stringify(form) !== JSON.stringify(initialValues)
  })
  
  function reset() {
    Object.assign(form, initialValues)
  }
  
  return { form, isDirty, reset }
}
```

### Pattern 4: Lifecycle Management

```typescript
export function useConnection(url: string) {
  const socket = ref(null)
  const connected = ref(false)
  
  function connect() {
    socket.value = new WebSocket(url)
    connected.value = true
  }
  
  function disconnect() {
    socket.value?.close()
    connected.value = false
  }
  
  onMounted(() => connect())
  onUnmounted(() => disconnect())
  
  return { connected, disconnect }
}
```

## Composables vs Utilities

### Composable (riutilizzabile in componenti)
```typescript
// src/composables/useTimer.ts
export function useTimer() {
  const time = ref(0)
  const timerInterval = ref(null)
  
  function start() {
    timerInterval.value = setInterval(() => {
      time.value++
    }, 1000)
  }
  
  onUnmounted(() => clearInterval(timerInterval.value))
  
  return { time, start }
}
```

### Utility (funzione pura)
```typescript
// src/lib/utils.ts
export function formatTime(seconds: number): string {
  return new Date(seconds * 1000).toISOString().slice(11, 19)
}
```

**Quando usare**:
- **Composable**: Quando necessita Vue reactivity, lifecycle hooks
- **Utility**: Quando è logica pura senza dipendenze da Vue

## Best Practices

### 1. Nomi di Composables

Inizia con `use`:
```typescript
// ✅ BENE
export function useCounter() { }
export function useFormState() { }

// ❌ MALE
export function counter() { }
export function getFormState() { }
```

### 2. Restituisci Ref, non Valori

```typescript
// ✅ BENE: Rimanere reattivi
return { count: ref(0) }

// ❌ MALE: Perdere reattività
return { count: 0 }
```

### 3. Gestisci Cleanup

```typescript
// ✅ BENE: Cleanup automatico
export function useWebSocket(url) {
  const socket = ref(null)
  
  onMounted(() => {
    socket.value = new WebSocket(url)
  })
  
  onUnmounted(() => {
    socket.value?.close()
  })
  
  return { socket }
}
```

### 4. Composables Riutilizzabili

```typescript
// ✅ BENE: Parametrizzabile
export function useFetch(url: string) {
  const data = ref(null)
  // ...
}

// Uso
const users = useFetch('/api/users')
const posts = useFetch('/api/posts')

// ❌ MALE: Hardcoded
export function useFetchUsers() { }
export function useFetchPosts() { }
```

### 5. Documenta Opzioni e Return

```typescript
/**
 * Fetch dati da un'API con retry automatico
 * @param url - URL API endpoint
 * @param retries - Numero di retry su errore (default: 3)
 * @returns {{ data, loading, error, refetch }}
 */
export function useFetch(url: string, retries = 3) {
  // ...
}
```

---

Prosegui con [08-STILI.md](./08-STILI.md) per il sistema di stili.
