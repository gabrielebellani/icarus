# API Layer - Icarus UI

## Panoramica

Il layer API gestisce tutta la comunicazione con il backend, sia HTTP che WebSocket.

### Principi

- **Centralizzato** - Client HTTP unico in `src/api/client.ts`
- **Tipizzato** - Tutte le response sono tipizzate con TypeScript
- **Sicuro** - Token JWT automaticamente aggiunto ai request
- **Resiliente** - Refresh automatico del token su 401

## HTTP Client

**Location**: `src/api/client.ts`

Questo file esporta la funzione `request()` che è la base per tutti i HTTP call.

### Implementazione

```typescript
import { useAuthStore } from '@/stores/auth'

let onAuthFailureCallback: (() => void) | null = null

export function setOnAuthFailure(callback: () => void) {
  onAuthFailureCallback = callback
}

export async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const auth = useAuthStore()
  const url = `${import.meta.env.VITE_API_URL}${path}`
  
  // 1. Aggiungi Authorization header
  const headers = new Headers(options?.headers || {})
  if (auth.accessToken) {
    headers.set('Authorization', `Bearer ${auth.accessToken}`)
  }
  
  // 2. Esegui request
  let res = await fetch(url, { ...options, headers })
  
  // 3. Se 401, prova refresh
  if (res.status === 401 && auth.refreshToken) {
    try {
      // Chiedi nuovo token
      const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: auth.refreshToken })
      })
      
      if (refreshRes.ok) {
        const tokens = await refreshRes.json()
        auth.setTokens(tokens)
        
        // Retry request originale con nuovo token
        headers.set('Authorization', `Bearer ${auth.accessToken}`)
        res = await fetch(url, { ...options, headers })
      } else {
        throw new Error('Refresh failed')
      }
    } catch {
      // Refresh fallito - logout
      auth.clearTokens()
      onAuthFailureCallback?.()
      throw new AuthError('Session expired')
    }
  }
  
  // 4. Parse response
  if (!res.ok) {
    throw new HttpError(res.status, await res.text())
  }
  
  return res.json() as Promise<T>
}
```

### Setup al App Init

In `src/main.ts`:

```typescript
import { useAuthStore } from '@/stores/auth'
import { setOnAuthFailure } from '@/api/client'

const app = createApp(App)
const router = createRouter(...)

app.use(createPinia())
app.use(router)

const auth = useAuthStore()
setOnAuthFailure(() => {
  router.push({ name: 'login' })
})

app.mount('#app')
```

## Endpoints API

### Authentication (`src/api/auth.ts`)

#### Login
```typescript
export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })
}

interface AuthResponse {
  access_token: string
  refresh_token: string
  user: User
}
```

**HTTP**: `POST /auth/login`

**Request**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "user": {
    "id": "123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### Register
```typescript
export async function register(
  email: string,
  password: string,
  name: string
): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name })
  })
}
```

**HTTP**: `POST /auth/register`

#### Refresh Token
```typescript
export async function refreshToken(
  refreshToken: string
): Promise<{ access_token: string }> {
  return request<{ access_token: string }>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken })
  })
}
```

**HTTP**: `POST /auth/refresh`

### Flight Tracking (`src/api/flight.ts`)

#### Start Tracking
```typescript
export async function getTracking(
  callsign: string
): Promise<TrackingRecord> {
  return request<TrackingRecord>(
    `/tracking?callsign=${encodeURIComponent(callsign)}`
  )
}

interface TrackingRecord {
  id: string
  user_id: string
  callsign: string
  payload: Flight | null
  created_at: string
  last_update: string
}

interface Flight {
  id: string
  callsign: string
  aircraft_type: string
  departure_airport: string
  arrival_airport: string
  departure_time: string
  arrival_time: string
  status: 'on-time' | 'delayed' | 'cancelled' | 'boarding'
  latitude: number
  longitude: number
  altitude: number
  speed: number
}
```

**HTTP**: `GET /tracking?callsign=BA148`

#### Stop Tracking
```typescript
export async function stopTracking(
  trackingId: string
): Promise<void> {
  return request(`/tracking/${trackingId}`, {
    method: 'DELETE'
  })
}
```

**HTTP**: `DELETE /tracking/{id}`

### Airport Tracking (`src/api/airport.ts`)

#### Get Tracked Airports
```typescript
export async function getAirportTrackings(): Promise<AirportTracking[]> {
  return request<AirportTracking[]>('/airport-trackings')
}

interface AirportTracking {
  id: string
  user_id: string
  airport_code: string
  airport_name: string
  created_at: string
}
```

**HTTP**: `GET /airport-trackings`

#### Get Timetable
```typescript
export async function getTimetable(
  trackingId: string,
  direction: 'arrivals' | 'departures'
): Promise<TimetableEntry[]> {
  return request<TimetableEntry[]>(
    `/airport-trackings/${trackingId}/timetable?direction=${direction}`
  )
}

interface TimetableEntry {
  id: string
  flight_number: string
  aircraft_type: string
  scheduled_time: string
  estimated_time: string
  actual_time: string | null
  status: 'scheduled' | 'boarding' | 'departed' | 'arrived' | 'delayed' | 'cancelled'
  origin_airport?: string
  destination_airport?: string
}
```

**HTTP**: `GET /airport-trackings/{id}/timetable?direction=arrivals|departures`

### Radar Tracking (`src/api/radar.ts`)

#### Get Radars
```typescript
export async function getRadarTrackings(): Promise<RadarTracking[]> {
  return request<RadarTracking[]>('/radar-trackings')
}

interface RadarTracking {
  id: string
  user_id: string
  name: string
  latitude: number
  longitude: number
  radius_km: number
  created_at: string
  aircraft_count: number
}
```

**HTTP**: `GET /radar-trackings`

#### Create Radar
```typescript
export async function createRadarTracking(data: {
  name: string
  latitude: number
  longitude: number
  radius_km: number
}): Promise<RadarTracking> {
  return request<RadarTracking>('/radar-trackings', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}
```

**HTTP**: `POST /radar-trackings`

#### Delete Radar
```typescript
export async function deleteRadarTracking(id: string): Promise<void> {
  return request(`/radar-trackings/${id}`, {
    method: 'DELETE'
  })
}
```

**HTTP**: `DELETE /radar-trackings/{id}`

### User Preferences (`src/api/preferences.ts`)

#### Get Preferences
```typescript
export async function fetchUserPreferences(): Promise<UserPreferences> {
  return request<UserPreferences>('/user/preferences')
}

interface UserPreferences {
  display_mode: 'minimal' | 'detailed' | 'compact'
  theme: 'dark' | 'light'
  notifications_enabled: boolean
  // ...
}
```

**HTTP**: `GET /user/preferences`

#### Update Preferences
```typescript
export async function updateUserPreferences(
  updates: Partial<UserPreferences>
): Promise<UserPreferences> {
  return request<UserPreferences>('/user/preferences', {
    method: 'PATCH',
    body: JSON.stringify(updates)
  })
}
```

**HTTP**: `PATCH /user/preferences`

### Configuration (`src/api/config.ts`)

#### Get Config
```typescript
export async function getAppConfig(): Promise<AppConfig> {
  return request<AppConfig>('/config')
}

interface AppConfig {
  registration_enabled: boolean
  password_reset_enabled: boolean
  api_base_url: string
  ws_base_url: string
  // ...
}
```

**HTTP**: `GET /config` (public, no auth required)

## WebSocket Real-Time

### Radar WebSocket

Il WebSocket per il radar è gestito da `src/composables/useRadarSocket.ts`.

**Protocol**: WebSocket
**URL**: `wss://{WS_API_URL}/radar/{radarId}`

**Authentication**:
```typescript
// Al connect, invia auth token
socket.send(JSON.stringify({
  type: 'auth',
  token: authStore.accessToken
}))
```

**Messages da Server**:
```typescript
// Aircraft update
{
  type: 'aircraft_update',
  data: {
    id: '1234',
    callsign: 'BA148',
    latitude: 51.5,
    longitude: -0.1,
    altitude: 35000,
    speed: 450,
    timestamp: '2024-01-15T10:30:00Z'
  }
}

// Aircraft left radar
{
  type: 'aircraft_removed',
  data: { id: '1234' }
}

// Connection closed (token expired)
{
  type: 'auth_failed'
}
```

**Utilizzo in Composable**:
```typescript
const socket = new WebSocket(wsUrl)

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  
  if (message.type === 'aircraft_update') {
    updateAircraft(message.data)
  } else if (message.type === 'auth_failed') {
    onAuthFailure()
  }
})

socket.addEventListener('close', () => {
  connectionState.value = 'closed'
})
```

## Error Handling

### HttpError

```typescript
class HttpError extends Error {
  constructor(
    public status: number,
    public body: string
  ) {
    super(`HTTP ${status}`)
  }
}

// Usage
try {
  const data = await getFlightData()
} catch (err) {
  if (err instanceof HttpError) {
    if (err.status === 404) {
      console.log('Not found')
    }
  }
}
```

### Retry Logic

Per le operazioni critiche, implementa retry:

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn()
    } catch (err) {
      if (i === maxAttempts - 1) throw err
      // Backoff esponenziale
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, i) * 1000)
      )
    }
  }
}

// Usage
const result = await withRetry(() => getFlightData())
```

## Environment Configuration

### `.env` (Development)
```
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3001
```

### `.env.production` (Production)
```
VITE_API_URL=https://api.icarus.example.com
VITE_WS_URL=wss://ws.icarus.example.com
```

### Utilizzo
```typescript
const apiUrl = import.meta.env.VITE_API_URL
const wsUrl = import.meta.env.VITE_WS_URL
```

## Best Practices

### 1. Centralizza API Calls

```typescript
// ✅ BENE: Funzione centralizzata
export async function getFlightData(callsign: string) {
  return request<Flight>(`/flight/${callsign}`)
}

// ❌ MALE: Spread throughout components
// async function fetchFlight() {
//   return fetch(`${API_URL}/flight/${callsign}`)
// }
```

### 2. Type Safety

```typescript
// ✅ BENE: Typed response
export async function getAirports(): Promise<Airport[]> {
  return request<Airport[]>('/airports')
}

// ❌ MALE: Any
export async function getAirports(): Promise<any> {
  return request('/airports')
}
```

### 3. Error Handling in Composables

```typescript
// ✅ BENE: Gestisci error nel composable
const { state, error, run } = useAsyncPageState(
  'Failed to load data'
)

run(async () => {
  data.value = await getFlightData()
})

// ❌ MALE: No error handling in component
const data = await getFlightData()  // Cosa se fallisce?
```

### 4. Cancellation Tokens (Optional)

Per richieste che possono essere cancellate:

```typescript
export function useFlightSearch() {
  const abortController = ref(new AbortController())
  
  async function search(callsign: string) {
    abortController.value.abort()  // Cancella search precedente
    abortController.value = new AbortController()
    
    return request(`/flights/${callsign}`, {
      signal: abortController.value.signal
    })
  }
  
  onUnmounted(() => abortController.value.abort())
  
  return { search }
}
```

---

Prosegui con [10-BUILD-DEPLOY.md](./10-BUILD-DEPLOY.md) per build e deployment.
