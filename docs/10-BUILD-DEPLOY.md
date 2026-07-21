# Build e Deployment - Icarus UI

## Setup Locale

### Prerequisiti

- **Node.js** 18+ (o **Bun** come runtime)
- **Bun** v1.0+ (package manager e runtime)
- **Git** per version control

### Installazione

1. **Clone il repository**:
```bash
git clone https://github.com/icarus/icarus-ui.git
cd icarus-ui
```

2. **Installa dipendenze**:
```bash
bun install
```

Questo installa tutte le dipendenze definite in `package.json` nella cartella `node_modules`.

3. **Setup environment variables**:
```bash
cp .env.local.example .env.local
```

Modifica `.env.local` con le tue configurazioni locali:
```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3001
```

### Development Server

```bash
bun run dev
```

Questo avvia il Vite dev server su `http://localhost:5173/`.

**Features**:
- Hot Module Replacement (HMR)
- Instant updates su save dei file
- Error overlay nel browser

### Type Checking

```bash
bun run type-check
```

Esegue TypeScript compiler per verificare errori di tipo senza compilare.

### Build per Production

```bash
bun run build
```

Questo compila l'app per production:
- Minificazione CSS e JavaScript
- Tree-shaking dei moduli inutilizzati
- Output in cartella `dist/`

**Output**:
```
dist/
├── index.html          # Entry point HTML
├── assets/
│   ├── index-xxx.js    # Bundled JavaScript
│   ├── index-xxx.css   # Bundled CSS
│   └── (altri assets)
└── (static files)
```

### Preview Build Locale

```bash
bun run preview
```

Esegue un preview del build production locally.

## Build Configuration

**File**: `vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  
  server: {
    port: 5173,
    strictPort: false,
    open: false
  },
  
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: false,  // Set true per production debugging
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
```

### Alias Path

Il build è configurato per usare `@` come alias per `src/`:

```typescript
// Equivalenti
import { useLogout } from '@/composables/useLogout'
import { useLogout } from './src/composables/useLogout'
```

## Environment Variables

### Development (`.env.local`)

```env
# API Configuration
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3001

# Optionals
VITE_DEBUG=true
VITE_MOCK_API=false
```

### Production (`.env.production`)

```env
# API Configuration
VITE_API_URL=https://api.icarus.example.com
VITE_WS_URL=wss://ws.icarus.example.com

# Optionals
VITE_DEBUG=false
VITE_MOCK_API=false
```

### Accesso in Codice

```typescript
const apiUrl = import.meta.env.VITE_API_URL

if (import.meta.env.DEV) {
  console.log('Development mode')
}

if (import.meta.env.PROD) {
  console.log('Production mode')
}
```

## Package Manager Commands

### Bun Commands

```bash
# Installa dipendenze
bun install

# Aggiungi package
bun add <package>

# Rimuovi package
bun remove <package>

# Run script
bun run <script-name>

# Esegui comandi npm-like
bunx <command>
```

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview",
    "type-check": "vue-tsc --noEmit"
  }
}
```

## Deployment

### Opzione 1: Netlify

1. **Connect GitHub**:
   - Vai su [Netlify](https://netlify.com)
   - Clicca "Connect GitHub repo"
   - Seleziona il repository

2. **Build Settings**:
   ```
   Build Command: bun run build
   Publish Directory: dist
   ```

3. **Environment Variables**:
   - Aggiungi `VITE_API_URL`, `VITE_WS_URL`

4. **Deploy**:
   - Netlify deploya automaticamente su push a main

### Opzione 2: Vercel

1. **Connect GitHub**:
   - Vai su [Vercel](https://vercel.com)
   - Clicca "Add New Project"
   - Import il repository

2. **Build Settings**:
   ```
   Build Command: bun run build
   Output Directory: dist
   ```

3. **Environment Variables**:
   - Aggiungi variabili in Project Settings

4. **Deploy**:
   - Automatico su push

### Opzione 3: Docker

Crea un `Dockerfile`:

```dockerfile
# Build stage
FROM oven/bun:latest as builder

WORKDIR /app
COPY . .

RUN bun install
RUN bun run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Installa simple HTTP server
RUN npm install -g http-server

# Copia build output
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["http-server", "./dist", "-p", "3000", "-c-1"]
```

Build e run:
```bash
docker build -t icarus-ui .
docker run -p 3000:3000 icarus-ui
```

### Opzione 4: Manual Server Deployment

1. **Build localmente**:
```bash
bun run build
```

2. **Upload `dist/` folder** al server via FTP/SSH

3. **Configure web server** (nginx, Apache) per servire `dist/index.html` per tutte le route

#### Nginx Configuration

```nginx
server {
  listen 80;
  server_name icarus.example.com;

  root /var/www/icarus-ui/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  # Cache static assets
  location ~* \.(js|css|svg|png|gif|ico)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
  }
}
```

#### Apache Configuration

```apache
<Directory /var/www/icarus-ui/dist>
  Options -MultiViews
  RewriteEngine On
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteRule ^ index.html [QSA,L]
</Directory>
```

## Performance Optimization

### Code Splitting

Vite automaticamente splitta il codice per route:

```typescript
// Lazy load view
const DashboardView = () => import('@/views/DashboardView.vue')
```

Questo genera un chunk separato caricato solo quando necessario.

### Asset Optimization

```bash
# Install sharp per image optimization
bun add -d sharp

# In vite.config.ts
import { imagetools } from 'vite-imagetools'

export default {
  plugins: [imagetools()]
}
```

### Bundle Analysis

```bash
# Install rollup-plugin-visualizer
bun add -d rollup-plugin-visualizer

# In vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer'

export default {
  plugins: [visualizer()]
}
```

Poi run `bun run build` e apri `dist/stats.html`.

## Versioning

### Semantic Versioning

Segui [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH
1.2.3
```

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (1.1.0): New features
- **PATCH** (1.0.1): Bug fixes

### Tagging Releases

```bash
# Tag una release
git tag v1.2.0
git push origin v1.2.0

# List tags
git tag -l
```

## CI/CD Pipeline

### GitHub Actions

Crea `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: oven-sh/setup-bun@v1
      
      - name: Install dependencies
        run: bun install
      
      - name: Type check
        run: bun run type-check
      
      - name: Build
        run: bun run build
      
      - name: Deploy to Netlify
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
        run: |
          npm install -g netlify-cli
          netlify deploy --prod --dir=dist
```

## Best Practices

### 1. Always Type Check Before Deploy

```bash
bun run type-check && bun run build
```

### 2. Test Build Locally

```bash
bun run build
bun run preview
# Verifica funzionalità nel browser
```

### 3. Environment Separation

- `.env` - Valori di default
- `.env.local` - Development (gitignored)
- `.env.production` - Production variables

### 4. Monitor Bundle Size

Monitora il bundle size ad ogni release:

```bash
bun run build

# Confronta size
ls -lh dist/assets/*.js
```

Mantieni bundle sotto 500KB gzipped.

### 5. Source Maps in Production (Cauto)

```typescript
// vite.config.ts
export default {
  build: {
    sourcemap: 'hidden'  // Source maps solo per error reporting tools
  }
}
```

### 6. Security Headers

Aggiungi security headers nel web server:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
```

---

Documentazione completata! Prosegui ad esplorare i file sorgente per approfondire specifici moduli.
