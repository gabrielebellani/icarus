# Architettura - Icarus UI

## Layering Architetturale

Icarus UI segue un'architettura a strati ben definiti, dove ogni strato ha responsabilità specifiche e comunica attraverso interfacce chiare.

### 1. Presentation Layer (Vue Components)

**Responsabilità**:
- Render UI
- Gestire interazioni utente
- Mostrare dati al componente

**Location**: `src/views/`, `src/components/`, `src/layouts/`

**Caratteristiche**:
- Componenti Vue 3 con `<script setup>`
- Utilizzano TypeScript per tipizzazione
- Delegano la logica di business ai composables
- Non contengono logica API diretta

**Esempio**:
```vue
<script setup lang="ts">
import { useAsyncPageState } from '@/composables/useAsyncPageState'
import { getAirportTrackings } from '@/api/airport'

const { state, error, run } = useAsyncPageState('Errore caricamento')
run(async () => {
  trackings.value = await getAirportTrackings()
})
</script>
```

### 2. Business Logic Layer (Composables)

**Responsabilità**:
- Orchestrare operazioni complesse
- Gestire stato temporaneo
- Coordinare API calls
- Implementare workflow del dominio

**Location**: `src/composables/`

**Caratteristiche**:
- Vue composables (`const myComposable = () => { ... }`)
- Reattivi (usano `ref`, `computed`, `watch`)
- Riusabili tra componenti
- Esportano stato e azioni

**Esempio**:
```typescript
export function useTimetable({ trackingId, onAuthFailure }) {
  const arrivals = ref([])
  const arrivalsLoading = ref(false)
  
  async function ensureLoaded(direction) {
    arrivalsLoading.value = true
    try {
      arrivals.value = await getTimetable(trackingId, direction)
    } catch (err) {
      if (err.status === 401) onAuthFailure()
    } finally {
      arrivalsLoading.value = false
    }
  }
  
  return { arrivals, arrivalsLoading, ensureLoaded }
}
```

### 3. State Management Layer (Pinia)

**Responsabilità**:
- Gestire stato globale dell'applicazione
- Persistere dati critici (auth tokens, preferences)
- Fornire source of truth unica

**Location**: `src/stores/`

**Caratteristiche**:
- Store Pinia definiti con `defineStore`
- State minimale (solo dati globali critici)
- Azioni per modificare lo state
- Getter computati per derivare dati

**Stores Disponibili**:

1. **authStore** (`src/stores/auth.ts`)
   - `accessToken`, `refreshToken` - JWT tokens
   - `isAuthenticated` - Computed boolean
   - `setTokens(tokens)` - Salva tokens
   - `clearTokens()` - Rimuove tokens
   - `bindClient(onAuthFailure)` - Wire il client HTTP

2. **preferencesStore** (`src/stores/preferences.ts`)
   - Preferenze utente (display mode, etc.)
   - Syncronizzate con backend

### 4. Data Access Layer (API Client)

**Responsabilità**:
- Comunicare con backend HTTP e WebSocket
- Gestire autenticazione e token refresh
- Error handling centralizzato
- Tipizzazione delle response

**Location**: `src/api/`

**Caratteristiche**:
- Funzioni riusabili per ogni risorsa (airport, flight, radar, etc.)
- Client HTTP centralizzato in `client.ts`
- Gestion automatica di token refresh
- WebSocket per dati real-time

**Moduli API**:
- `auth.ts` - Autenticazione (login, register, logout, refresh)
- `airport.ts` - Tracking aeroporti
- `flight.ts` - Tracciamento voli
- `radar.ts` - Tracciamento radar geografici
- `preferences.ts` - Preferenze utente
- `config.ts` - Configurazione app
- `client.ts` - HTTP client base

### 5. Type Definitions Layer

**Responsabilità**:
- Definire tipi TypeScript per i dati

**Location**: `src/types/`

**Contenuto**:
```typescript
// src/types/flight.ts
export interface Flight {
  id: string
  callsign: string
  aircraft_type: string
  departure_airport: string
  arrival_airport: string
  // ...
}

export interface TrackingRecord {
  id: string
  user_id: string
  payload: Flight | null
}
```

## Pattern di Comunicazione

### Pattern: Fetch on Mount con Error Handling

Scenario: Una view deve caricare dati al mount.

```typescript
import { useAsyncPageState } from '@/composables/useAsyncPageState'
import { getAirportTrackings } from '@/api/airport'

export default {
  setup() {
    const trackings = ref([])
    const { state, error, run, retry } = useAsyncPageState(
      'Failed to load airports'
    )
    
    run(async () => {
      trackings.value = await getAirportTrackings()
    })
    
    return { trackings, state, error, retry }
  }
}
```

Template:
```vue
<template>
  <PageSpinner v-if="state === 'loading'" />
  <PageError v-else-if="state === 'error'" :message="error" @retry="retry" />
  <div v-else><!-- Content --></div>
</template>
```

### Pattern: Real-Time WebSocket

Scenario: Tracciamento radar con aggiornamenti live.

```typescript
import { useRadarSocket } from '@/composables/useRadarSocket'

const { connectionState, aircraft, error } = useRadarSocket({
  radarId: '123',
  onAuthFailure: logout
})

// connectionState è reattivo: 'connecting' → 'open' → 'error'
// aircraft si aggiorna automaticamente ad ogni nuovo messaggio
```

### Pattern: Form Submission con Validation

Scenario: Form con validazione Zod + vee-validate.

```typescript
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'

const schema = toTypedSchema(
  z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Min 8 chars')
  })
)

const { handleSubmit, values } = useForm({ validationSchema: schema })

const onSubmit = handleSubmit(async (values) => {
  await login(values.email, values.password)
})
```

## Flusso di Autenticazione Dettagliato

### 1. Login
```
User Input (email, password)
  ↓
LoginView.vue → handleSubmit()
  ↓
src/api/auth.ts → login(email, password)
  ↓
HTTP POST /auth/login → Backend
  ↓
Response: { access_token, refresh_token }
  ↓
authStore.setTokens() → localStorage
  ↓
Router → redirect('/dashboard')
```

### 2. Protected Request with Auto-Refresh
```
Component → API call (getAirportTrackings)
  ↓
src/api/client.ts → request()
  ↓
Add Authorization header con token
  ↓
HTTP request
  ↓
IF status === 401:
  ├─ Call POST /auth/refresh con refresh_token
  ├─ Get new access_token
  ├─ Retry request originale con nuovo token
  └─ IF refresh fails → onAuthFailure() → redirect('/login')
ELSE:
  └─ Return response normalmente
```

### 3. Logout
```
User clicks "Sign Out"
  ↓
useLogout() composable
  ↓
authStore.clearTokens()
  ├─ localStorage.removeItem(tokens)
  └─ accessToken.value = null
  ↓
Router → redirect('/auth/login')
```

## Layout e Routing Structure

### Route Hierarchy

```
/ (AuthenticatedLayout)
  ├── / (dashboard)
  ├── /airports
  ├── /airports/:trackingId/timetable
  ├── /radar
  ├── /radar/:id (radar-tracking)
  └── /settings

/auth/login (no layout)
/auth/register
/auth/recovery
/auth/reset
/auth/initialize (requires auth)
```

### AuthenticatedLayout

Tutte le route autenticate sono wrappate da `AuthenticatedLayout`, che renderizza:
1. `AppHeader` - Logo, nav links, settings/logout buttons
2. `<RouterView />` - La view specifica (DashboardView, AirportsView, etc.)

```vue
<!-- src/layouts/AuthenticatedLayout.vue -->
<template>
  <div class="authenticated-layout">
    <AppHeader v-show="!isChromeHidden" />
    <RouterView />
  </div>
</template>
```

### Fullscreen Mode

Alcune views (`RadarTrackingView`, `TimetableView`) supportano fullscreen. In questo stato:
- `AppHeader` viene nascosto via `useAppChrome().isChromeHidden`
- La view occupa tutto lo schermo
- Escape key esce da fullscreen

```typescript
const { isChromeHidden } = useAppChrome()

watch(isFullscreen, (value) => {
  isChromeHidden.value = value
})
```

## Reattività e Change Detection

Vue 3 Composition API con TypeScript:

```typescript
// Ref per stato mutabile
const isLoading = ref(false)
isLoading.value = true // Update

// Computed per dati derivati
const displayName = computed(() => 
  airport.value?.name ?? 'Unknown'
)

// Watch per side effects
watch(activeTab, (tab) => {
  loadTab(tab)
})

// Reactive per oggetti
const state = reactive({
  count: 0,
  name: 'test'
})
```

## Error Handling Strategy

### Global Level (API Client)
```typescript
// src/api/client.ts
if (res.status === 401) {
  // Try refresh
  // If fails → call onAuthFailure() → app redirect to login
}

if (!res.ok) {
  throw new HttpError(res.status, body)
}
```

### Composable Level
```typescript
// useAsyncPageState
try {
  await operation()
  state.value = 'ready'
} catch (err) {
  error.value = errorMessage
  state.value = 'error'
}
```

### Component Level
```vue
<PageError 
  v-if="state === 'error'" 
  :message="error" 
  @retry="retry"
/>
```

---

Prosegui con [03-DIRECTORY-STRUCTURE.md](./03-DIRECTORY-STRUCTURE.md) per il breakdown delle directory.
