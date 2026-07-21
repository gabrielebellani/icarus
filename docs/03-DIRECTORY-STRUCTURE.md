# Struttura delle Directory - Icarus UI

## Albero della Struttura

```
icarus-ui/
├── src/                           # Sorgente dell'applicazione
│   ├── api/                       # Layer di accesso ai dati
│   ├── assets/                    # Asset statici (immagini, font, etc.)
│   ├── components/                # Componenti Vue riusabili
│   ├── composables/               # Vue composables (logica riutilizzabile)
│   ├── layouts/                   # Layout wrapper per le route
│   ├── lib/                       # Utility functions e helpers
│   ├── router/                    # Vue Router configuration
│   ├── stores/                    # Pinia stores (state management)
│   ├── types/                     # Definizioni TypeScript
│   ├── views/                     # Componenti pagina (route components)
│   ├── App.vue                    # Root component
│   ├── main.ts                    # Entry point
│   └── style.css                  # Stili globali
├── public/                        # Asset pubblici (favicon, etc.)
├── dist/                          # Build output (gitignored)
├── docs/                          # Questa documentazione
├── .github/                       # GitHub config
│   └── instructions/              # Custom instructions per Copilot
├── node_modules/                  # Dipendenze (gitignored)
├── index.html                     # HTML template
├── package.json                   # Dipendenze e scripts
├── tsconfig.json                  # TypeScript config
├── vite.config.ts                 # Vite configuration
├── components.json                # shadcn-vue configuration
└── bun.lock                       # Lock file per Bun
```

## Dettaglio Directories

### `/src` - Sorgente Applicazione

Root della logica applicativa. Contiene tutti il codice TypeScript/Vue.

#### `/src/api/` - Data Access Layer

Tutte le comunicazioni con il backend HTTP e WebSocket.

```
src/api/
├── client.ts           # HTTP client base con auth e refresh
├── config.ts           # Configurazione app (API base URL, etc.)
├── auth.ts             # Endpoints autenticazione (login, register, refresh)
├── airport.ts          # Endpoints tracking aeroporti
├── flight.ts           # Endpoints tracciamento voli
├── radar.ts            # Endpoints radar geografici
└── preferences.ts      # Endpoints preferenze utente
```

**Pattern**: Ogni file esporta funzioni async:
```typescript
export async function login(email: string, password: string) {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })
}
```

#### `/src/components/` - Componenti Vue

Componenti riusabili organizzati per dominio.

```
src/components/
├── layout/             # Componenti di layout globali
│   ├── AppHeader.vue   # Header con nav e account menu
│   ├── PageSpinner.vue # Loading spinner
│   └── PageError.vue   # Error message + retry button
├── ui/                 # Componenti shadcn-vue (UI primitivi)
│   ├── button/
│   ├── card/
│   ├── dialog/
│   ├── form/
│   ├── input/
│   ├── label/
│   ├── select/
│   └── separator/
├── airport/            # Componenti feature: aeroporti
│   ├── AirportCard.vue
│   ├── AirportSearchForm.vue
│   └── TimetableBoard.vue
├── flight/             # Componenti feature: voli
│   ├── FlightCard.vue
│   ├── FlightCardDetailed.vue
│   ├── FlightCardMinimal.vue
│   ├── FlightSearchForm.vue
│   └── FlightTracking.vue
├── radar/              # Componenti feature: radar
│   ├── RadarCard.vue
│   ├── RadarCreateDialog.vue
│   └── RadarAircraftCard.vue
├── settings/           # Componenti feature: impostazioni
│   ├── PreferencesSection.vue
│   ├── SecuritySection.vue
│   ├── ApiUsageSection.vue
│   ├── ApiRequestsChartSection.vue
│   └── DangerZoneSection.vue
└── HelloWorld.vue      # Component demo (può essere rimosso)
```

**Organizzazione**:
- `layout/` - Componenti strutturali globali
- `ui/` - Componenti primitivi dal design system
- Feature folders (`airport/`, `flight/`, `radar/`, `settings/`) - Componenti specifici del dominio

#### `/src/composables/` - Vue Composables

Logica riutilizzabile e reattiva.

```
src/composables/
├── useAsyncPageState.ts    # Loading/error/retry pattern per pagine
├── useLogout.ts            # Logout e redirect
├── useAppChrome.ts         # Flag per mostrare/nascondere header globale
├── useRadarSocket.ts       # WebSocket per dati radar real-time
├── useAircraftCarousel.ts  # Logica carousel per aeromobili
├── useApiRequestsChart.ts  # Dati per grafico utilizzo API
└── useTimetable.ts         # Fetch e paginazione timetable aeroporti
```

**Pattern**: Composables esportano stato reattivo e azioni.

#### `/src/layouts/` - Layout Wrapper

Layout per strutturare le pagine.

```
src/layouts/
└── AuthenticatedLayout.vue # Layout principale per route autenticate
```

Renderizza `AppHeader` + `<RouterView />` per le pagine.

#### `/src/lib/` - Utility Functions

Funzioni helper di utilità generale.

```
src/lib/
└── utils.ts # Utility funzioni (es. class merging per Tailwind)
```

#### `/src/router/` - Routing

Configurazione Vue Router.

```
src/router/
├── index.ts  # Definizione route, navigation guards
└── nav.ts    # NAV_ITEMS config per AppHeader (menu items)
```

**Route Structure**:
- Route padre `/` con `AuthenticatedLayout` wrapper
- Route child per le view autenticate
- Route separate `/auth/*` per login/register

#### `/src/stores/` - Pinia State

Store per stato globale.

```
src/stores/
├── auth.ts          # Auth tokens e isAuthenticated
└── preferences.ts   # Preferenze utente
```

State minimale: solo dati critici globali.

#### `/src/types/` - TypeScript Definitions

Definizioni di tipo per i dati.

```
src/types/
├── airport.ts    # AirportTracking, Timetable, etc.
├── flight.ts     # Flight, TrackingRecord, etc.
├── radar.ts      # RadarTracking, RadarAircraft, etc.
├── timetable.ts  # TimetableEntry, etc.
└── preferences.ts# UserPreferences, etc.
```

**Pattern**: Export interface e type per ogni dominio.

#### `/src/views/` - Route Components

Componenti pagina (uno per route).

```
src/views/
├── DashboardView.vue        # / - Tracciamento voli
├── AirportsView.vue         # /airports - Lista aeroporti tracciati
├── TimetableView.vue        # /airports/:id/timetable - Timetable aeroporto
├── RadarsView.vue           # /radar - Lista radar geografici
├── RadarTrackingView.vue    # /radar/:id - Radar tracking live
├── SettingsView.vue         # /settings - Impostazioni utente
└── auth/                    # Autenticazione
    ├── AuthLayout.vue       # Layout wrapper per auth pages
    ├── LoginView.vue        # /auth/login
    ├── RegisterView.vue     # /auth/register
    ├── RecoveryView.vue     # /auth/recovery - Password reset flow
    ├── ResetView.vue        # /auth/reset - Reset password
    └── InitializeView.vue   # /auth/initialize - Post-login setup
```

Ogni view è un componente fullpage che:
1. Fetcha i dati su mount
2. Renderizza lo stato (loading/error/ready)
3. Organizza la layout della pagina

#### `/src/assets/` - Asset Statici

Immagini, font, media, etc.

```
src/assets/
└── (file statici)
```

#### `/src` Root Files

- **App.vue** - Root component Vue (mount point per router)
- **main.ts** - Entry point: setup Vue, Pinia, Router, auth client
- **style.css** - Stili globali (Tailwind + override custom)

### `/public/` - Asset Pubblici

File serviti staticamente (favicon, robots.txt, etc.).

```
public/
└── (asset pubblici)
```

### `/docs/` - Documentazione

Questa documentazione tecnica.

```
docs/
├── 00-INDICE.md               # Questo file
├── 01-OVERVIEW.md             # Overview generale
├── 02-ARCHITETTURA.md         # Architettura
├── 03-DIRECTORY-STRUCTURE.md  # Questa directory
├── 04-ROUTING.md              # Sistema routing
├── 05-COMPONENTI.md           # Componenti UI
├── 06-STATE-MANAGEMENT.md     # Pinia stores
├── 07-COMPOSABLES.md          # Composables
├── 08-STILI.md                # Design e styling
├── 09-API.md                  # API layer
└── 10-BUILD-DEPLOY.md         # Build e deployment
```

### `/` - Root Files

- **package.json** - Dipendenze e script npm/bun
- **tsconfig.json** - Config TypeScript
- **tsconfig.app.json** - Config TS per app
- **tsconfig.node.json** - Config TS per build
- **vite.config.ts** - Config Vite (build tool)
- **components.json** - Config shadcn-vue (quali componenti sono installati)
- **index.html** - HTML template per Vite
- **bun.lock** - Lock file Bun (come package-lock.json per npm)
- **.env** - Variabili ambiente (dev)
- **.env.production** - Variabili ambiente (production)
- **.gitignore** - File ignorati da git
- **README.md** - Readme progetto
- **.github/instructions/** - Custom instructions per Copilot AI

## Convenzioni di Naming

### File e Folder
- **Componenti Vue**: `PascalCase.vue` (es. `AirportCard.vue`)
- **Composables**: `camelCase.ts` (es. `useRadarSocket.ts`)
- **API files**: `camelCase.ts` (es. `airport.ts`)
- **Type files**: `camelCase.ts` (es. `flight.ts`)
- **Folder feature**: `kebab-case` (es. `airport/`, `flight/`)

### CSS Classes (SCSS/Tailwind)
- **Block**: `lowercase-block` (es. `.airports`, `.radar-tracking-view`)
- **Element**: `block__element` (es. `.airports__main`, `.radar-tracking-view__nav`)
- **Modifier**: `block__element--modifier` (es. `.button--active`, `.status-dot--green`)
- **Tailwind**: Utility classes inline (es. `flex flex-col gap-2`)

### TypeScript Interfaces
- **Interfaces**: `PascalCase` (es. `Flight`, `AirportTracking`)
- **Type Aliases**: `PascalCase` (es. `ViewState`)
- **Constants**: `SCREAMING_SNAKE_CASE` (es. `DISPLAY_MODES`, `NAV_ITEMS`)

### Vue Component Props/Emits
- **Props**: `camelCase` (es. `isLoading`, `onUpdate`)
- **Events**: `kebab-case` in template (es. `@retry`, `@update-value`)
- **V-model**: `modelValue` per default

## Principi di Organizzazione

### Feature-Oriented
Raggruppare per feature/dominio, non per tipo di file:
```
❌ SBAGLIATO:
/components/
/composables/
/api/
  ├── flight-related files
  ├── airport-related files
  └── radar-related files

✅ CORRETTO:
/components/flight/
/components/airport/
/components/radar/
/api/flight.ts
/api/airport.ts
/api/radar.ts
```

### Colocation
Tenere codice relato vicino:
- Componenti feature in `components/feature/`
- API feature in `api/feature.ts`
- Types feature in `types/feature.ts`
- Composables usati da una feature nello stesso dominio

### Minimal API Surface
Esportare solo ciò che è necessario:
```typescript
// ✅ Esporta specifiche
export async function login(email: string, password: string) { ... }
export interface LoginResponse { ... }

// ❌ Evita esportazioni massive
export * from './module'
```

### Single Responsibility
Ogni file ha una responsabilità chiara:
- `AirportCard.vue` - Renderizza una singola airport card
- `useRadarSocket.ts` - Gestisce socket connection per radar
- `airport.ts` - API calls per aeroporti

---

Prosegui con [04-ROUTING.md](./04-ROUTING.md) per il sistema di routing.
