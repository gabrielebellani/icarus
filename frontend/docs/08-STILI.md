# Stili e Design - Icarus UI

## Architettura Styling

Icarus UI utilizza un'architettura styling ibrida:
- **Tailwind CSS** - Utility-first framework per layout e styling rapido
- **SCSS** - Preprocessore CSS per stili custom e complex
- **CSS Custom Properties** - Design tokens centralizzati

### Flusso Styling

```
CSS Custom Properties (Design Tokens)
  ↓
Tailwind Utilities
  ↓
SCSS Scoped Styles
  ↓
Final Rendered CSS
```

## Configurazione Tailwind

**File**: `tailwind.config.ts`

```typescript
export default {
  theme: {
    extend: {
      colors: {
        // Design tokens sono in CSS variables
        // Tailwind li referenzia con 'hsl(var(--color))'
      },
      spacing: {
        // Spacing scale standard
      }
    }
  },
  plugins: []
}
```

## Design Tokens (CSS Variables)

I colori e i layout sono definiti come **CSS Custom Properties** in `src/style.css`:

### Colori di Base

```css
:root {
  /* Background */
  --background: oklch(0.1 0.02 270);      /* Near-black blu-violetto */
  --foreground: oklch(0.97 0 0);          /* Quasi bianco */
  
  /* Surface */
  --card: oklch(0.12 0.025 270);          /* Slightly lighter than bg */
  --card-foreground: oklch(0.97 0 0);     /* Text on card */
  
  /* Borders e separatori */
  --border: oklch(0.2 0.01 270);          /* Subtle border color */
  --muted-foreground: oklch(0.52 0.01 270);  /* Muted text (secondary) */
  
  /* Accent */
  --accent: oklch(0.5 0.2 40);            /* Primary accent */
  --accent-foreground: oklch(0.97 0 0);
  
  /* Semantico */
  --success: oklch(0.6 0.15 142);         /* Verde - on-time */
  --warning: oklch(0.65 0.15 60);         /* Giallo - delayed */
  --destructive: oklch(0.6 0.2 15);       /* Rosso - cancelled */
  
  /* Raggio border */
  --radius: 0.5rem;
}
```

### Dark Mode

Tutti i CSS variables sono già in dark mode (colori scuri come default).

### Utilizzo Colori in Tailwind

```vue
<div class="bg-background text-foreground border-border">
  <!-- Tailwind usa var(--background), var(--foreground), etc. -->
</div>
```

### Utilizzo Colori in SCSS

```scss
.flight-card {
  background-color: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  
  &__status {
    &--on-time {
      color: var(--success);
    }
    
    &--delayed {
      color: var(--warning);
    }
  }
}
```

## Tailwind Utilities

### Layout Flexbox

```vue
<div class="flex flex-row gap-4">      <!-- Flex row con gap -->
<div class="flex flex-col gap-2">       <!-- Flex column -->
<div class="flex justify-between">      <!-- Space between -->
<div class="flex items-center">         <!-- Vertical center -->
```

### Spacing

```vue
<div class="p-4">                       <!-- Padding 1rem -->
<div class="m-2">                       <!-- Margin 0.5rem -->
<div class="px-6 py-4">                 <!-- Padding X e Y -->
<div class="gap-3">                     <!-- Gap tra figli flex -->
```

### Sizing

```vue
<div class="w-full">                    <!-- Width 100% -->
<div class="h-screen">                  <!-- Height 100vh -->
<button class="w-20 h-20">              <!-- 5rem x 5rem -->
```

### Text

```vue
<div class="text-sm">                   <!-- Small text -->
<div class="text-base font-bold">       <!-- Bold text -->
<div class="text-muted-foreground">     <!-- Secondary text -->
<div class="text-center">               <!-- Text center -->
```

### Colori

```vue
<div class="bg-card text-foreground">   <!-- Background card -->
<div class="border-border">             <!-- Border colore -->
<div class="text-success">              <!-- Testo verde -->
```

### Responsive

```vue
<div class="text-sm md:text-base lg:text-lg">  <!-- Responsive text -->
<div class="w-full md:w-1/2">                   <!-- Responsive width -->
<div class="hidden md:block">                   <!-- Hidden on mobile -->
```

### Dark/Light Toggle

```vue
<div class="dark:bg-gray-900">          <!-- Dark mode styles -->
```

## SCSS Scoped Styles

Per styling feature-specific che non rientran in utility classes, usa SCSS scoped:

```vue
<style scoped lang="scss">
.flight-card {
  display: flex;
  border-radius: var(--radius);
  background-color: var(--card);
  padding: 1rem;
  gap: 1rem;
  
  /* BEM naming convention */
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  &__title {
    font-size: 1.125rem;
    font-weight: bold;
    color: var(--foreground);
  }
  
  &__status {
    padding: 0.25rem 0.75rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    font-weight: 600;
    
    /* Status modifiers */
    &--on-time {
      background-color: oklch(0.3 0.15 142 / 0.2);
      color: var(--success);
    }
    
    &--delayed {
      background-color: oklch(0.4 0.15 60 / 0.2);
      color: var(--warning);
    }
    
    &--cancelled {
      background-color: oklch(0.35 0.2 15 / 0.2);
      color: var(--destructive);
    }
  }
  
  &__actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
}
</style>
```

## Tema Visual

### Dark Instrument-Like Design

L'app segue un design "strumento" scuro, simile a cockpit e monitoring dashboards:

- **Background**: Near-black (oklch 0.1) - riduce affaticamento occhi
- **Elevation**: Leggera variation nel blu (oklch 0.12-0.15) per depth
- **Text**: Quasi bianco (oklch 0.97) per alto contrasto
- **Accenti**: Colori mirati per status/state (verde OK, rosso error)
- **Density**: High information density, minimal whitespace

### Palette Colori

#### Status Semantici

| Status | Colore | Uso |
|--------|--------|-----|
| On-Time | Verde (`oklch(0.6 0.15 142)`) | Volo puntuale |
| Early | Blu (`oklch(0.5 0.2 260)`) | Volo anticipato |
| Delayed | Giallo (`oklch(0.65 0.15 60)`) | Volo in ritardo |
| Cancelled | Rosso (`oklch(0.6 0.2 15)`) | Volo cancellato |

#### Interazione

| Elemento | Colore | Uso |
|----------|--------|-----|
| Hover | `oklch(0.2 0.02 270)` | Background hover |
| Active | Accent color | Link/button attivo |
| Focus | Accent color con border | Keyboard focus |
| Disabled | `oklch(0.3 0 0)` | Elemento disabilitato |

### Typography

#### Font Stack
```css
font-family: system-ui, -apple-system, sans-serif;
/* Usa i font di sistema per performance e consistenza */
```

#### Sizes

| Elemento | Size | Line Height |
|----------|------|-------------|
| Heading 1 | 2rem (32px) | 1.2 |
| Heading 2 | 1.5rem (24px) | 1.3 |
| Body | 1rem (16px) | 1.6 |
| Small | 0.875rem (14px) | 1.5 |
| Caption | 0.75rem (12px) | 1.4 |

#### Weight

- **Bold** (700) - Headings, emphasis
- **Semibold** (600) - Subheadings, labels
- **Regular** (400) - Body text
- **Mono** (400) - Codice, timestamp

## Responsive Design

L'app è mobile-first, breakpoints standard:

```css
/* Mobile (default) */
/* sm: 640px */
/* md: 768px */
/* lg: 1024px */
/* xl: 1280px */
/* 2xl: 1536px */
```

### Utilizzo

```vue
<div class="text-sm md:text-base lg:text-lg">
  Responsive text size
</div>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  Grid responsive
</div>
```

## Animazioni

### Transition Globali

```css
/* Smooth transitions su properties */
* {
  transition: background-color 200ms ease,
              border-color 200ms ease,
              color 200ms ease;
}
```

### Animazioni Custom (Spinner)

```scss
@keyframes page-spinner-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.page-spinner {
  animation: page-spinner-spin 1s linear infinite;
}
```

## Accessibilità

### Contrasto

Tutti i testi hanno alto contrasto (min WCAG AA):
```
- Text on background: oklch(0.97) on oklch(0.1) = ~17:1
- Text on card: oklch(0.97) on oklch(0.12) = ~15:1
```

### Focus Visible

```css
button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

### Semantic HTML

```vue
<!-- ✅ BENE: Semantic -->
<button @click="logout">Sign Out</button>
<nav><ul><li><RouterLink>...</RouterLink></li></ul></nav>

<!-- ❌ MALE: Non semantic -->
<div @click="logout" class="button">Sign Out</div>
```

## Stili Globali

**Location**: `src/style.css`

```css
/* Reset e defaults */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background-color: var(--background);
  color: var(--foreground);
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 1rem;
  line-height: 1.6;
}

/* Tailwind imports */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom global components */
.prose {
  /* Custom prose styling se utilizzato */
}
```

## Best Practices Styling

### 1. Preferisci Tailwind per Layout

```vue
<!-- ✅ BENE: Tailwind utilities -->
<div class="flex flex-col gap-4 p-6">
  <h1 class="text-2xl font-bold">Title</h1>
</div>

<!-- ❌ MALE: Inline styles o CSS custom -->
<div style="display: flex; flex-direction: column; gap: 1rem; padding: 1.5rem;">
  <h1 style="font-size: 2rem; font-weight: bold;">Title</h1>
</div>
```

### 2. Usa SCSS per Complex Styling

```vue
<!-- ✅ BENE: SCSS scoped per logica complessa -->
<style scoped lang="scss">
.radar-map {
  position: relative;
  width: 100%;
  height: 500px;
  
  &__layer {
    position: absolute;
    // ...
  }
}
</style>

<!-- ❌ MALE: Tailwind per cose complicate -->
<div class="relative w-full h-500px">
  <div class="absolute ...">
</div>
```

### 3. Design Tokens via CSS Variables

```scss
// ✅ BENE: Centralizzato
color: var(--foreground);
background: var(--card);

// ❌ MALE: Magic numbers
color: #f5f5f5;
background: #1a1a1a;
```

### 4. BEM per Scoped Styles

```scss
// ✅ BENE: BEM naming
.flight-card {
  &__header { }
  &__title { }
  &__status--delayed { }
}

// ❌ MALE: Random nesting
.flight-card {
  .header { }
  .title { }
  .delayed { }
}
```

### 5. Mobile-First Responsive

```vue
<!-- ✅ BENE: Mobile base, aggiungi per desktop -->
<div class="text-sm md:text-base lg:text-lg">

<!-- ❌ MALE: Desktop base, nascondi su mobile -->
<div class="text-lg md:hidden">
```

---

Prosegui con [09-API.md](./09-API.md) per il layer API.
