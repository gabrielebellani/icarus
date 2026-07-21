# Icarus — Open-source Flight Tracking UI

A modular, Vue 3 + TypeScript web interface for real-time flight tracking with live radar, airport timetables, and user preferences management.

## Features

- **Live Flight Tracking**: Real-time radar visualization with WebSocket updates
- **Flight & Airport Search**: Quick lookup and tracking of flights and airports
- **User Preferences**: Customizable dashboard variants (minimal, detailed, flight-focused)
- **Account Management**: Password recovery, settings, API usage tracking
- **Self-Hosted**: Run on your own infrastructure with Docker
- **Responsive UI**: Built with Vue 3, Tailwind CSS, and shadcn-vue components

## Architecture

```
┌─────────────────────────────────┐
│   Frontend (nginx + SPA)        │
│  • Vue 3 + TypeScript + Vite   │
│  • Tailwind + shadcn-vue       │
│  • Reverse-proxy to /api       │
└──────────────┬──────────────────┘
               │
        (same-origin proxy)
               │
┌──────────────▼──────────────────┐
│      Backend (Bun + SQLite)     │
│  • REST API + WebSocket server │
│  • User authentication          │
│  • Flight tracking logic        │
│  • Redis for caching            │
└──────────────┬──────────────────┘
               │
      ┌────────┴────────┐
      │                 │
   SQLite           Redis
```

## Self-Hosting with Docker

### Prerequisites

- Docker and Docker Compose installed
- Basic knowledge of environment variables and Docker

### Quick Start

1. **Clone or download the repository**:
   ```bash
   git clone https://github.com/gabrielebellani/icarus.git
   cd icarus
   ```

2. **Create `.env` file from the example**:
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` with your configuration**:
   - Set secure `SUPERUSER_PASSWORD` and `JWT_SECRET`
   - Update `FRONTEND_URL` if accessing from a different hostname/domain
   - Optional: Configure SMTP for password recovery emails

4. **Start the services**:
   ```bash
   docker compose up -d
   ```

5. **Access the application**:
   - Open `http://localhost` (or your configured `FRONTEND_PORT`)
   - Log in with username `admin` and the password from `.env`

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SUPERUSER_USERNAME` | Yes | `admin` | Initial admin username |
| `SUPERUSER_PASSWORD` | Yes | - | Initial admin password (change this!) |
| `JWT_SECRET` | Yes | - | Secret for JWT token signing (min 32 chars) |
| `FRONTEND_URL` | No | `http://localhost` | Public URL for password recovery emails |
| `FRONTEND_PORT` | No | `80` | Port to expose the frontend on the host |
| `DB_PATH` | No | `/app/data/icarus-db.sqlite` | SQLite database path inside container |
| `REDIS_URL` | No | `redis://redis-cache:6379` | Redis connection URL |
| `SMTP_*` | No | - | Optional email settings for password recovery |

### Docker Compose in Existing Setup

If you already run other services with Docker Compose, you can integrate Icarus by adding these services to your existing `docker-compose.yml`:

```yaml
services:
  icarus-frontend:
    image: ghcr.io/gabrielebellani/icarus-frontend:latest
    ports:
      - "80:80"
    depends_on:
      icarus-backend:
        condition: service_healthy
    networks:
      - your-network

  icarus-backend:
    image: ghcr.io/gabrielebellani/icarus-backend:latest
    environment:
      PORT: "3465"
      SUPERUSER_USERNAME: admin
      SUPERUSER_PASSWORD: ${ICARUS_PASSWORD}
      JWT_SECRET: ${ICARUS_JWT_SECRET}
      REDIS_URL: redis://redis:6379
      JETAPI_URL: http://jetapi:8922
      DB_PATH: /app/data/icarus-db.sqlite
    volumes:
      - icarus-db:/app/data
    depends_on:
      - redis
      - jetapi
    networks:
      - your-network

volumes:
  icarus-db:

networks:
  your-network:
    external: true
```

Then update your `.env`:
```bash
ICARUS_PASSWORD=your-secure-password-here
ICARUS_JWT_SECRET=your-jwt-secret-here-min-32-chars
```

### Upgrading

To upgrade to a new version:

```bash
docker compose down
docker compose pull
docker compose up -d
```

Data persists in named volumes (`backend-data`, `redis-data`), so you won't lose any information.

## Development

### Local Development Setup

For development, you'll need Node.js/Bun and can use the local dev environment without Docker:

**Frontend**:
```bash
cd frontend
bun install
bun run dev
```
Runs on `http://localhost:5173` with Vite dev proxy.

**Backend**:
```bash
cd backend
bun install
bun run index.ts
```
Runs on `http://localhost:3465` with local SQLite and Redis.

### Project Structure

```
icarus/
├── frontend/                # Vue 3 SPA
│   ├── src/
│   │   ├── api/            # HTTP client, API calls
│   │   ├── components/     # UI components (shadcn-vue + custom)
│   │   ├── composables/    # Reusable logic (auth, websockets, etc.)
│   │   ├── layouts/        # Page layouts
│   │   ├── stores/         # Pinia state management
│   │   ├── types/          # TypeScript types
│   │   ├── views/          # Page components
│   │   └── router/         # Vue Router config
│   ├── Dockerfile          # Multi-stage build (bun + nginx)
│   └── docker/
│       └── nginx.conf      # Reverse proxy config
│
├── backend/                 # Bun server
│   ├── controllers/        # Request handlers
│   ├── services/           # Business logic
│   ├── repositories/       # Data access layer
│   ├── middleware/         # Auth & request processing
│   ├── migrations/         # Database schema
│   ├── utils/              # Helpers (env, jwt, email, etc.)
│   ├── Dockerfile          # Production image
│   └── src/
│       └── index.ts        # Server entry point
│
├── docker-compose.yml      # Production orchestration
├── .env.example            # Configuration template
└── README.md              # This file
```

## Key Technologies

- **Frontend**: Vue 3, TypeScript, Tailwind CSS, shadcn-vue, Leaflet maps, Vite
- **Backend**: Bun (TypeScript runtime), SQLite, Redis, Nodemailer (email)
- **Deployment**: Docker, Docker Compose, nginx
- **Authentication**: JWT tokens, password recovery via email (optional)

## Security Considerations

- **Always** change `SUPERUSER_PASSWORD` and `JWT_SECRET` in production
- Use strong, random passwords (at least 16 characters)
- Set `FRONTEND_URL` to your actual domain for password recovery links
- Consider using a reverse proxy (Traefik, Caddy) in front of nginx for HTTPS/TLS
- Keep Docker images updated regularly
- Monitor logs for suspicious activity

## Troubleshooting

### Backend won't start: "Missing required environment variable"
- Check all required variables are set in `.env`
- Ensure `JWT_SECRET` is at least 32 characters

### Frontend can't connect to API
- Verify `VITE_API_BASE_URL` is set to `/api` in frontend build
- Check backend healthcheck: `docker compose logs backend`
- Ensure backend service is healthy: `docker compose ps`

### WebSocket connection fails
- Check that proxy is configured with `ws: true` (handled automatically)
- Verify nginx config includes WebSocket upgrade headers
- Check Docker network: `docker network inspect icarus`

### Database file missing or corrupted
- SQLite database is stored in the `backend-data` volume
- To reset: `docker volume rm icarus_backend-data && docker compose up -d`
- To backup: `docker run --rm -v icarus_backend-data:/data -v $(pwd):/backup alpine cp /data/icarus-db.sqlite /backup/`

## License

Licensed under the [AGPL-3.0 License](LICENSE).

## Contributing

Contributions welcome! Please open issues and pull requests on GitHub.

## Support

- **Issues & Bug Reports**: GitHub Issues
- **Questions**: GitHub Discussions
- **Documentation**: See `/docs` folder for detailed architecture and guides

---

**Made with ❤️ for flight tracking enthusiasts**
