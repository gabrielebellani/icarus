# Routing - Icarus UI

## Configurazione Routes

Il routing è definito in `src/router/index.ts` usando Vue Router v5.

### Router Instance

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // Routes definition
  ]
})

// Navigation guards
router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return next({ name: 'login' })
  }
  
  if (to.meta.guest && auth.isAuthenticated) {
    return next({ name: 'dashboard' })
  }
  
  next()
})
```

## Route Tree

### Public Routes (Non-Authenticated)

#### Authentication Flow Routes

```
/auth/login              # Login page (email + password)
/auth/register           # Register new account
/auth/recovery           # Password reset - richiesta reset
/auth/reset              # Password reset - change password
/auth/initialize         # Post-login setup (requires auth)
```

Queste route usano `AuthLayout` come wrapper, che:
- Nasconde l'header globale
- Renderizza un layout specifico per auth
- Non richiede autenticazione (eccetto `/auth/initialize`)

### Protected Routes (Authenticated)

Tutte le route autenticate sono nidificate sotto il parent route `/` con `AuthenticatedLayout`:

```
/                        # Parent layout (AuthenticatedLayout)
├── /                    # Dashboard
│   └── Nesting: "/"
├── /airports            # Airports list
│   └── Nesting: "airports"
├── /airports/:trackingId/timetable
│   └── Nesting: "timetable" (activeFor: ["airports"])
├── /radar               # Radars list
│   └── Nesting: "radar"
├── /radar/:id           # Radar tracking (fullscreen)
│   └── Nesting: "radar-tracking" (activeFor: ["radar"])
└── /settings            # Settings & preferences
    └── Nesting: "settings"
```

### Route Definition (Completa)

```typescript
const routes = [
  {
    path: '/',
    component: AuthenticatedLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'dashboard',
        component: DashboardView
      },
      {
        path: '/airports',
        name: 'airports',
        component: AirportsView
      },
      {
        path: '/airports/:trackingId/timetable',
        name: 'timetable',
        component: TimetableView
      },
      {
        path: '/radar',
        name: 'radar',
        component: RadarsView
      },
      {
        path: '/radar/:id',
        name: 'radar-tracking',
        component: RadarTrackingView
      },
      {
        path: '/settings',
        name: 'settings',
        component: SettingsView
      }
    ]
  },
  {
    path: '/auth',
    component: AuthLayout,
    meta: { guest: true },
    children: [
      {
        path: 'login',
        name: 'login',
        component: LoginView
      },
      {
        path: 'register',
        name: 'register',
        component: RegisterView
      },
      {
        path: 'recovery',
        name: 'recovery',
        component: RecoveryView
      },
      {
        path: 'reset',
        name: 'reset',
        component: ResetView
      },
      {
        path: 'initialize',
        name: 'initialize',
        component: InitializeView,
        meta: { requiresAuth: true }  // Richiede autenticazione
      }
    ]
  }
]
```

## Navigation Items Configuration

La navigazione è centralizzata in `src/router/nav.ts`:

```typescript
// src/router/nav.ts
export interface NavItem {
  name: string        // Nome della route
  label: string       // Testo da mostrare
  activeFor?: string[]  // Route aggiuntive che considerare "attive"
}

export const NAV_ITEMS: NavItem[] = [
  {
    name: 'dashboard',
    label: 'Flight'
  },
  {
    name: 'airports',
    label: 'Airports',
    activeFor: ['timetable']  // /timetable mostra "airports" attivo
  },
  {
    name: 'radar',
    label: 'Radars',
    activeFor: ['radar-tracking']  // /radar/:id mostra "radar" attivo
  }
]
```

### Utilizzo in AppHeader

```vue
<!-- src/components/layout/AppHeader.vue -->
<script setup lang="ts">
import { NAV_ITEMS } from '@/router/nav'

function isActive(item: NavItem) {
  const currentRouteName = route.name
  return (
    item.name === currentRouteName ||
    item.activeFor?.includes(currentRouteName) ?? false
  )
}
</script>

<template>
  <nav class="nav">
    <RouterLink
      v-for="item in NAV_ITEMS"
      :key="item.name"
      :to="{ name: item.name }"
      :class="['nav-link', { 'nav-link--active': isActive(item) }]"
    >
      {{ item.label }}
    </RouterLink>
  </nav>
</template>
```

## Route Parameters

### Parametri Dinamici

Alcuni route hanno parametri dinamici:

```
/airports/:trackingId/timetable
  - :trackingId = ID della airport tracking (string)
  - Accesso in componente: route.params.trackingId

/radar/:id
  - :id = ID del radar (string)
  - Accesso in componente: route.params.id
```

Accesso nei componenti:

```typescript
import { useRoute } from 'vue-router'

const route = useRoute()
console.log(route.params.trackingId)  // Accesso diretto
console.log(route.params.id)
```

## Navigation Guards

### Global Navigation Guard

```typescript
router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  
  // Require authentication
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return next({ name: 'login' })
  }
  
  // Redirect authenticated users away from auth pages
  if (to.meta.guest && auth.isAuthenticated) {
    return next({ name: 'dashboard' })
  }
  
  next()
})
```

### Trigger Actions on Route Change

In una view, puoi reagire ai cambiamenti di route:

```typescript
import { useRoute } from 'vue-router'

const route = useRoute()

watch(() => route.params.trackingId, (newId) => {
  loadTimetable(newId)
})
```

## Lazy Loading (Code Splitting)

Per componenti pesanti, puoi usare lazy loading:

```typescript
const DashboardView = () => import('@/views/DashboardView.vue')
const AirportsView = () => import('@/views/AirportsView.vue')

// Routes
{
  path: '/',
  name: 'dashboard',
  component: DashboardView
}
```

Vite bundle questi automaticamente in chunk separati.

## Redirect e Navigation

### Programmatic Navigation

```typescript
import { useRouter } from 'vue-router'

const router = useRouter()

// Navigate to route by name
router.push({ name: 'dashboard' })

// Navigate to route by path
router.push('/airports')

// Navigate with params
router.push({
  name: 'timetable',
  params: { trackingId: '123' }
})

// Navigate with query string
router.push({
  name: 'dashboard',
  query: { search: 'BA' }
})

// Replace (no history)
router.replace({ name: 'login' })

// Back/Forward
router.back()
router.forward()
```

### RouterLink per Link Navigabili

```vue
<RouterLink :to="{ name: 'airports' }">
  View Airports
</RouterLink>

<RouterLink
  :to="{ name: 'timetable', params: { trackingId: airport.id } }"
  class="link"
>
  View Timetable
</RouterLink>
```

### Active Link Styling

```vue
<RouterLink
  :to="{ name: 'dashboard' }"
  class="nav-link"
  active-class="nav-link--active"  <!-- Aggiunto automaticamente quando attivo -->
>
  Flight
</RouterLink>
```

## Auth Flow Redirect

### Login Success
```
/auth/login
  ↓ (successful login)
Router.push({ name: 'dashboard' })
  ↓
/
  ↓
authStore.setTokens() (salva token)
  ↓
Authenticated, can access protected routes
```

### Session Expiry
```
User on authenticated route (es. /airports)
  ↓
API call failed con 401 (token scaduto)
  ↓
API client calls onAuthFailure callback
  ↓
onAuthFailure = () => router.push({ name: 'login' })
  ↓
Redirect to /auth/login
  ↓
authStore.clearTokens()
```

### Logout
```
User clicks logout button
  ↓
useLogout composable
  ↓
authStore.clearTokens()
  ↓
router.push({ name: 'login' })
  ↓
/auth/login
```

## Query Parameters

Per passare dati optionali tramite URL:

```typescript
// Navigate con query
router.push({
  name: 'dashboard',
  query: { search: 'BA148' }
})

// Accesso in componente
const searchQuery = ref(route.query.search ?? '')
watch(() => route.query, (query) => {
  performSearch(query.search)
})
```

## History Mode

L'app usa `createWebHistory()`, che genera URL "normali":

```
✅ /airports
✅ /radar/123
✅ /airports/456/timetable?tab=arrivals

❌ No hash (#) in URL
```

Questo richiede che il server rediriga tutti i path non-matching a `index.html`.

## Nested Views e Components

Con router annidati, puoi avere layout multipli:

```
/                          (AuthenticatedLayout)
  ├── /                    (DashboardView)
  ├── /airports            (AirportsView)
  └── /settings            (SettingsView)

/auth                      (AuthLayout)
  ├── /auth/login          (LoginView)
  └── /auth/register       (RegisterView)
```

Ogni componente genitore (AuthenticatedLayout, AuthLayout) renderizza `<RouterView />` che contiene il figlio appropriato.

```vue
<!-- src/layouts/AuthenticatedLayout.vue -->
<template>
  <div class="authenticated-layout">
    <AppHeader v-show="!isChromeHidden" />
    <RouterView />  <!-- Renderizza la view corrente -->
  </div>
</template>
```

## Best Practices

1. **Usa nome route** `{ name: 'dashboard' }` instead of path `'/dashboard'`
   - Più robusto ai cambiamenti di path
   - Refactoring path cambia solo in router

2. **Centralizza NAV_ITEMS**
   - Single source of truth per menu
   - Aggiungi route una sola volta

3. **Type-safe route params**
   - Usa `route.params.id as string` per esplicità
   - Definisci interfaces per typed params

4. **Handle route errors**
   - Guarda i 404 nella view
   - Redirige a home se risorsa non trovata

5. **Lazy load le views**
   - Dinamicamente importa le view per code splitting
   - Migliora performance con tante route

---

Prosegui con [05-COMPONENTI.md](./05-COMPONENTI.md) per i componenti Vue.
