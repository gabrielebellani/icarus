# Documentazione Tecnica - Icarus UI

## Indice della Documentazione

Questa documentazione fornisce una guida completa all'architettura, la struttura e l'organizzazione del codebase di **Icarus UI**, un'applicazione Vue 3 TypeScript per il tracciamento dei voli.

### File della Documentazione

1. **[01-OVERVIEW.md](./01-OVERVIEW.md)** - Overview generale
   - Cos'è Icarus UI
   - Tecnologie principali
   - Principi architetturali

2. **[02-ARCHITETTURA.md](./02-ARCHITETTURA.md)** - Architettura generale
   - Struttura dell'applicazione
   - Flow dei dati
   - Layering (UI, State, API)

3. **[03-DIRECTORY-STRUCTURE.md](./03-DIRECTORY-STRUCTURE.md)** - Struttura delle directory
   - Breakdown completo di ogni cartella
   - Convenzioni di naming
   - Organizzazione dei file

4. **[04-ROUTING.md](./04-ROUTING.md)** - Sistema di routing
   - Route definite
   - Protezione delle route
   - Layout nidificati

5. **[05-COMPONENTI.md](./05-COMPONENTI.md)** - Componenti UI e feature
   - Componenti shadcn-vue
   - Componenti custom
   - Componenti feature-specific

6. **[06-STATE-MANAGEMENT.md](./06-STATE-MANAGEMENT.md)** - State management
   - Store Pinia
   - Auth store
   - Preferences store

7. **[07-COMPOSABLES.md](./07-COMPOSABLES.md)** - Composables e logica riutilizzabile
   - Lista dei composables
   - Casi d'uso
   - Esempi di utilizzo

8. **[08-STILI.md](./08-STILI.md)** - Sistema di stili
   - Tailwind CSS + SCSS
   - Design tokens
   - Dark mode e temi

9. **[09-API.md](./09-API.md)** - Layer API e networking
   - HTTP client
   - WebSocket
   - Endpoints disponibili

10. **[10-BUILD-DEPLOY.md](./10-BUILD-DEPLOY.md)** - Build e deployment
    - Setup locale
    - Build process

### Quick Start

Se sei nuovo al progetto:
1. Leggi [01-OVERVIEW.md](./01-OVERVIEW.md) per capire il contesto generale
2. Studia [02-ARCHITETTURA.md](./02-ARCHITETTURA.md) per l'architecture pattern
3. Usa [03-DIRECTORY-STRUCTURE.md](./03-DIRECTORY-STRUCTURE.md) come reference map
4. Approfondisci i topic specifici che ti servono

### Info Progetto

- **Nome**: Icarus UI
- **Descrizione**: Web UI per il tracciamento dei voli
- **Framework**: Vue 3 + TypeScript + Vite
- **Package Manager**: Bun
- **UI Library**: shadcn-vue
- **Styling**: Tailwind CSS + SCSS
- **State Management**: Pinia

---

*Ultima aggiornamento: Luglio 2026*
