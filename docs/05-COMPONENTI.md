# Componenti Vue - Icarus UI

## Componenti UI Primitivi (shadcn-vue)

La libreria **shadcn-vue** fornisce componenti base per costruire le UI.

Tutti i componenti shadcn-vue sono ubicati in `src/components/ui/` e importabili così:

```typescript
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
```

### Button

```vue
<Button>Click me</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button :disabled="isLoading">{{ isLoading ? 'Loading...' : 'Submit' }}</Button>
```

**Props**:
- `variant` - 'default' | 'outline' | 'ghost' | 'destructive'
- `size` - 'sm' | 'md' | 'lg'
- `disabled` - boolean

### Input

```vue
<Input 
  v-model="email"
  placeholder="Enter email"
  type="email"
/>
<Input 
  v-model="password"
  type="password"
  placeholder="Enter password"
/>
```

**Props**:
- `v-model` - Two-way binding
- `type` - 'text' | 'email' | 'password' | etc
- `placeholder` - Input placeholder
- `disabled` - Disabilita l'input

### Card

```vue
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
  <CardFooter>
    Footer content
  </CardFooter>
</Card>
```

**Componenti**:
- `<Card>` - Container principale
- `<CardHeader>` - Header area
- `<CardTitle>` - Title text
- `<CardDescription>` - Descrizione
- `<CardContent>` - Main content
- `<CardFooter>` - Footer area
- `<CardAction>` - Action content (icons, buttons)

### Dialog

```vue
<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Action</DialogTitle>
      <DialogDescription>
        Are you sure?
      </DialogDescription>
    </DialogHeader>
    <!-- Dialog body -->
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">Cancel</Button>
      </DialogClose>
      <Button @click="confirm">Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Componenti**:
- `<Dialog>` - Container
- `<DialogTrigger>` - Elemento che apre il dialog (es. button)
- `<DialogContent>` - Contenuto del dialog
- `<DialogHeader>` - Header area
- `<DialogTitle>` - Titolo
- `<DialogDescription>` - Descrizione
- `<DialogFooter>` - Footer con azioni
- `<DialogClose>` - Elemento per chiudere (emits close event)
- `<DialogScrollContent>` - Content con scrolling

### Form

La form è basata su **vee-validate** + **Zod** per validazione:

```vue
<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'

const schema = toTypedSchema(
  z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Min 8 chars')
  })
)

const { handleSubmit, values, errors } = useForm({
  validationSchema: schema
})

const onSubmit = handleSubmit(async (data) => {
  await submitForm(data)
})
</script>

<template>
  <form @submit="onSubmit">
    <FormItem>
      <FormLabel for="email">Email</FormLabel>
      <FormControl>
        <Input
          id="email"
          v-model="values.email"
          type="email"
        />
      </FormControl>
      <FormMessage v-if="errors.email">
        {{ errors.email }}
      </FormMessage>
    </FormItem>

    <FormItem>
      <FormLabel for="password">Password</FormLabel>
      <FormControl>
        <Input
          id="password"
          v-model="values.password"
          type="password"
        />
      </FormControl>
      <FormMessage v-if="errors.password">
        {{ errors.password }}
      </FormMessage>
    </FormItem>

    <Button type="submit">Submit</Button>
  </form>
</template>
```

**Componenti**:
- `<FormItem>` - Wrapper per form field
- `<FormLabel>` - Label text
- `<FormControl>` - Wrapper per input control
- `<FormDescription>` - Help text
- `<FormMessage>` - Error message

### Select

```vue
<Select v-model="selectedValue">
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option-1">Option 1</SelectItem>
    <SelectItem value="option-2">Option 2</SelectItem>
    <SelectItem value="option-3">Option 3</SelectItem>
  </SelectContent>
</Select>
```

**Componenti**:
- `<Select>` - Container
- `<SelectTrigger>` - Elemento trigger (button)
- `<SelectValue>` - Placeholder / valore selezionato
- `<SelectContent>` - Dropdown content
- `<SelectItem>` - Singola opzione

### Alert

```vue
<Alert variant="default">
  <AlertTitle>Info</AlertTitle>
  <AlertDescription>Something happened</AlertDescription>
</Alert>

<Alert variant="destructive">
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>An error occurred</AlertDescription>
</Alert>
```

**Varianti**:
- `default` - Informazione
- `destructive` - Errore/Warning

### Label

```vue
<Label for="username">Username</Label>
<Input id="username" />
```

### Separator

```vue
<div>Section 1</div>
<Separator />
<div>Section 2</div>
```

## Componenti Custom Layout

### AppHeader

Renderizza la navigazione principale dell'app.

**Location**: `src/components/layout/AppHeader.vue`

**Props**: Nessuna

**Features**:
- Logo icarus
- Menu di navigazione (da NAV_ITEMS)
- Active link highlighting
- Account menu (Settings / Logout)
- Responsive mobile

**Usage**:
```vue
<AppHeader />  <!-- Usually in AuthenticatedLayout -->
```

Automaticamente:
- Naviga usando router-link
- Calcola active state in base alla route corrente
- Mostra Settings + Logout button

### PageSpinner

Spinner di caricamento con label.

**Location**: `src/components/layout/PageSpinner.vue`

**Props**:
- `label?: string` - Testo sotto lo spinner

**Usage**:
```vue
<PageSpinner v-if="isLoading" label="Loading flights..." />
```

### PageError

Messaggio di errore con bottone retry.

**Location**: `src/components/layout/PageError.vue`

**Props**:
- `message: string` - Messaggio di errore

**Emits**:
- `retry` - Emesso quando l'utente clicca "Retry"

**Usage**:
```vue
<PageError 
  v-if="error" 
  :message="error"
  @retry="retryFetch"
/>
```

## Componenti Feature-Specific

### Componenti Flight (`src/components/flight/`)

#### FlightCard
```vue
<FlightCard :flight="flightData" />
```
Card compatta con info volo (callsign, airports, status).

#### FlightCardDetailed
```vue
<FlightCardDetailed :flight="flightData" />
```
Card estesa con dettagli completi del volo.

#### FlightCardMinimal
```vue
<FlightCardMinimal :flight="flightData" />
```
Card minimal con essenziali.

#### FlightSearchForm
```vue
<FlightSearchForm @search="performSearch" />
```
Form per ricercare un volo (callsign input + search button).

#### FlightTracking
```vue
<FlightTracking :tracking="trackingRecord" />
```
Componente per mostrare un tracking attivo.

### Componenti Airport (`src/components/airport/`)

#### AirportCard
```vue
<AirportCard :airport="airportData" />
```
Card per visualizzare un'airport tracking.

#### AirportSearchForm
```vue
<AirportSearchForm @search="performSearch" />
```
Form per ricercare un aeroporto.

#### TimetableBoard
```vue
<TimetableBoard 
  :airportId="airportId"
  :entries="timetableEntries"
/>
```
Tabella con timetable arrivals/departures.

#### TimetableRow
```vue
<TimetableRow 
  :entry="timetableEntry"
/>
```
Singola riga di timetable.

### Componenti Radar (`src/components/radar/`)

#### RadarCard
```vue
<RadarCard :radar="radarData" />
```
Card per visualizzare un radar tracking.

#### RadarAircraftCard
```vue
<RadarAircraftCard :aircraft="aircraftData" />
```
Card per singolo aeromobilo nel radar.

#### RadarCreateDialog
```vue
<RadarCreateDialog @created="onRadarCreated" />
```
Dialog per creare un nuovo radar.

### Componenti Settings (`src/components/settings/`)

#### PreferencesSection
```vue
<PreferencesSection />
```
Form per preferenze utente.

#### SecuritySection
```vue
<SecuritySection />
```
Impostazioni di sicurezza (password, 2FA, etc.).

#### ApiUsageSection
```vue
<ApiUsageSection />
```
Info su utilizzo API.

#### ApiRequestsChartSection
```vue
<ApiRequestsChartSection />
```
Grafico storico richieste API.

#### DangerZoneSection
```vue
<DangerZoneSection />
```
Azioni pericolose (cancella account, etc.).

## Struttura Template Pattern

### Pattern: View con Async State

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useAsyncPageState } from '@/composables/useAsyncPageState'
import { getFlightTrackings } from '@/api/flight'
import PageSpinner from '@/components/layout/PageSpinner.vue'
import PageError from '@/components/layout/PageError.vue'

const trackings = ref([])
const { state, error, run, retry } = useAsyncPageState(
  'Failed to load trackings'
)

run(async () => {
  trackings.value = await getFlightTrackings()
})
</script>

<template>
  <div class="dashboard-view">
    <PageSpinner v-if="state === 'loading'" label="Loading flights..." />
    <PageError v-else-if="state === 'error'" :message="error" @retry="retry" />
    <div v-else class="content">
      <FlightCard
        v-for="tracking in trackings"
        :key="tracking.id"
        :flight="tracking.payload"
      />
    </div>
  </div>
</template>
```

### Pattern: Form con Validazione

```vue
<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'

const schema = toTypedSchema(
  z.object({
    searchQuery: z.string().min(1, 'Enter a callsign')
  })
)

const { handleSubmit, values } = useForm({
  validationSchema: schema
})

const onSubmit = handleSubmit(async (data) => {
  emit('search', data.searchQuery)
})
</script>

<template>
  <form @submit="onSubmit" class="search-form">
    <FormItem>
      <FormLabel>Flight Callsign</FormLabel>
      <FormControl>
        <Input
          v-model="values.searchQuery"
          placeholder="e.g., BA148"
        />
      </FormControl>
    </FormItem>
    <Button type="submit">Search</Button>
  </form>
</template>
```

### Pattern: Iterazione su Array

```vue
<template>
  <div class="airports-list">
    <AirportCard
      v-for="airport in airports"
      :key="airport.id"
      :airport="airport"
      @click="selectAirport(airport)"
    />
  </div>
</template>
```

### Pattern: Conditional Rendering

```vue
<template>
  <div>
    <!-- If condition -->
    <div v-if="isAuthenticated">Welcome!</div>
    
    <!-- Else-if -->
    <div v-else-if="isLoading">Loading...</div>
    
    <!-- Else -->
    <div v-else>Please login</div>
  </div>
</template>
```

## CSS e Styling

Tutti i componenti usano **Tailwind CSS** per utility classes:

```vue
<template>
  <div class="flex flex-col gap-4 p-6">
    <Button class="w-full">Full Width</Button>
    <Card class="rounded-lg shadow-md">
      <CardContent class="p-4">
        Content
      </CardContent>
    </Card>
  </div>
</template>
```

Per custom styling feature-specific, usa SCSS:

```vue
<style scoped lang="scss">
.flight-card {
  display: flex;
  gap: 1rem;
  
  &__title {
    font-weight: bold;
  }
  
  &__status {
    &--on-time {
      color: var(--color-success);
    }
    
    &--delayed {
      color: var(--color-warning);
    }
  }
}
</style>
```

## Best Practices

1. **Usa shadcn-vue per UI standard**
   - Button, Input, Card, Form, Dialog
   - Coerenza design

2. **Componenti custom per domain-specific UI**
   - FlightCard, RadarAircraftCard
   - Logica e UI together

3. **Props tipizzate con TypeScript**
   ```typescript
   interface Props {
     flight: Flight
     isHighlighted?: boolean
   }
   ```

4. **Emits tipizzati**
   ```typescript
   defineEmits<{
     select: [flight: Flight]
     delete: [id: string]
   }>()
   ```

5. **Slot per flessibilità**
   ```vue
   <template>
     <Card>
       <slot name="header" />
       <CardContent>
         <slot />
       </CardContent>
     </Card>
   </template>
   ```

6. **Lazy load se pesanti**
   ```typescript
   import { defineAsyncComponent } from 'vue'
   const HeavyChart = defineAsyncComponent(
     () => import('./HeavyChart.vue')
   )
   ```

---

Prosegui con [06-STATE-MANAGEMENT.md](./06-STATE-MANAGEMENT.md) per lo state management.
