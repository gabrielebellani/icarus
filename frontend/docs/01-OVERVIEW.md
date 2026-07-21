# Overview - Icarus UI

## Cos'è Icarus UI

Icarus UI è l'interfaccia web della piattaforma **Icarus**, un sistema completo per il tracciamento e il monitoraggio dei voli. L'applicazione permette agli utenti di:

- **Tracciare voli singoli** in tempo reale tramite identificativi di aeromobili
- **Monitorare aeroporti** per arrivals/departures programmati e in tempo reale
- **Gestire radar geografici** per monitorare il traffico aereo in zone specifiche
- **Gestire preferenze utente** e configurazioni dell'applicazione
- **Consultare statistiche API** sul consumo delle risorse

## Stack Tecnologico

### Frontend
- **Vue 3** - Framework JavaScript reattivo
- **TypeScript** - Tipizzazione statica per JavaScript
- **Vite** - Build tool e dev server veloce
- **Tailwind CSS** - Utility-first CSS framework
- **SCSS** - Preprocessore CSS per stili custom

### Librerie Principali
- **shadcn-vue** - Componenti UI reusabili (button, dialog, form, card, etc.)
- **Pinia** - State management per Vue
- **vue-router** - Routing nel client
- **vee-validate + Zod** - Form validation
- **@vueuse/core** - Composables utility
- **Lucide Vue** - Icone SVG

### Package Manager & Runtime
- **Bun** - Runtime JS veloce e package manager (alternativa a Node.js/npm)

### Development
- **TypeScript** - Tipizzazione statica
- **TSC** - Type checking
- **ESLint/Prettier** - Code quality (se configurato)

## Principi Architetturali

### 1. Modularità e Feature-Oriented Organization
L'applicazione è organizzata per feature/moduli piuttosto che per tipo di file. Ogni feature (ad esempio "flight", "airport", "radar") raggruppa:
- Componenti UI specifici della feature
- Logica di business (composables, API calls)
- Tipi TypeScript
- Stili locali

### 2. Separazione dei Concerns
L'architettura segue una netta separazione tra:
- **Presentation Layer** (Vue components)
- **State Management** (Pinia stores)
- **Business Logic** (Composables)
- **Data Access** (API client)

### 3. Composable-First Approach
La logica riutilizzabile è implementata come Vue composables, non classi o funzioni pure. Questo mantiene la reattività e l'integrazione con Vue.

### 4. API Decoupling
Tutta la comunicazione con il backend passa attraverso un client HTTP centralizzato (`src/api/client.ts`), che gestisce:
- Autenticazione (token JWT)
- Refresh automatico del token
- Redirect su 401 (sessione scaduta)
- Error handling globale

### 5. Dark Instrument-Like Design
Secondo le design guidelines dell'applicazione (vedi `.github/instructions/design-guidelines.instructions.md`):
- Background scuro (near-black blu-violetto)
- Alta densità informativa
- Design orientato alla readability operazionale
- Accenti mirati, non molti colori

## Flusso Dati Principale

```
User Interaction (Vue Component)
         ↓
Event Handler / Form Submit
         ↓
Composable (useAsyncPageState, useRadarSocket, etc.)
         ↓
API Call (src/api/...)
         ↓
HTTP Client (src/api/client.ts)
         ↓
Backend Server
         ↓
Response → Pinia Store (opzionale)
         ↓
Component Re-render (reattività Vue)
```

## Struttura Logica

### Entry Point
- `src/main.ts` - Inizializzazione app Vue, setup Pinia e Router

### Core App
- `src/App.vue` - Componente root (mount point)
- `src/layouts/AuthenticatedLayout.vue` - Layout wrapper per route autenticate

### Route Management
- `src/router/index.ts` - Definizione route
- `src/router/nav.ts` - Configurazione menu di navigazione

### Views (Pagine)
- `src/views/` - Componenti pagina (DashboardView, AirportsView, etc.)
- `src/views/auth/` - Flow di autenticazione (Login, Register, etc.)

### Components
- `src/components/` - Componenti riusabili
  - `layout/` - Componenti di layout (AppHeader, etc.)
  - `ui/` - Componenti primitivi UI (button, card, form, etc.)
  - `airport/`, `flight/`, `radar/`, `settings/` - Componenti feature-specific

### Business Logic
- `src/composables/` - Vue composables per logica riutilizzabile
- `src/stores/` - Pinia stores per state globale

### Data & API
- `src/api/` - Layer di accesso dati (HTTP, WebSocket)
- `src/types/` - Definizioni TypeScript per i dati

### Utilità
- `src/lib/` - Utility functions
- `src/style.css` - Stili globali

## Authentication Flow

1. **Login**: User accede con username/password
2. **Token Storage**: Access token e refresh token salvati in localStorage
3. **Request Interception**: Ogni request HTTP include il token nel header
4. **Token Refresh**: Quando il token scade, il client richiede automaticamente un nuovo token
5. **Session Expiry**: Se il refresh fallisce, l'app redirige il login
6. **Logout**: I token vengono cancellati e l'utente è reindirizzato al login

## State Management Pattern

L'app usa **Pinia** per lo state globale:

```typescript
export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(null)
  const isAuthenticated = computed(() => !!accessToken.value)
  
  function setTokens(tokens) { ... }
  function clearTokens() { ... }
  
  return { accessToken, isAuthenticated, setTokens, clearTokens }
})
```

Lo state è minimalista: vengono salvati solo i dati globalmente necessari (auth tokens, user preferences).

## Tema Design

### Colori
- **Background**: `oklch(0.1 0.02 270)` - Near-black blu-violetto
- **Text**: `oklch(0.97 0 0)` - Quasi bianco
- **Accent**: Colori derivati da design tokens CSS

### Tipografia
- **Heading**: Bold, lettering-spacing negativo per compattezza
- **Body**: Regolare, high contrast
- **Mono**: Per numeri, codici, timestamp

### Componenti
- Rounded corners moderate (`var(--radius)`)
- Separatori sottili per divisione visuale
- High information density, basso whitespace

---

Prosegui con [02-ARCHITETTURA.md](./02-ARCHITETTURA.md) per dettagli architetturali.
