# The flight tracker for those who care what's over their heads.

Web interface for real-time flight tracking, live radar and airport timetables.

### Inspiration:

This project is inspired by The Flight Wall (https://theflightwall.com/) and wants to be a self-hosted, cheaper and 100%
software alternative.
There's no need for specific hardware to run Icarus.

## Screenshots
### Radar live updates
![Radar section screenshots with fullscreen and non-fullscreen](./docs/images/readme/Radar.png?raw=true "Radar section")

### Flight tracking
![Flight tracking section screenshots with fullscreen and non-fullscreen](./docs/images/readme/Flight.png?raw=true "Flight tracking section")

### Airports timetable
![Airports timetable section screenshots with fullscreen and non-fullscreen](./docs/images/readme/Airports.png?raw=true "Airports timetable section")

## Features

### 📡 Radars

The Radar allows you to see which aircraft are currently in the sky above a given location and inside a given radius.

### 🛬 Flight

Track a flight from the moment it leaves the gate to the moment it lands, see its speed and realtime altitude and
progress.

### ✈️ Airports

See your favourite airports arrivals and departures on a convenient timetable.

### 📊 Usage

Track your usage of third party services in the Preferences section.

## Data sources (read carefully):

This project is 100% hobbyist and not meant to be a large-scale production-ready application.
Data are gathered from third party services that are free and open source or that have a free tier.
- FlightAware (https://flightaware.com/)
- OpenSky (https://opensky.org/)
- ADSB.lol (https://adsb.lol/)
- adsbdb.com (https://adsbdb.com/)
- JetPhotos and FlightRadar24 (https://www.jetphotos.com/ and https://www.flightradar24.com/)

### FlightAware - API key required
FlightAware is the most reliable source of information used by this project. 
It requires an API key to access their data. **Each Icarus user account** must register a FlightAware account and get its own API key.

FlightAware API are not free but currently (as of October 2026) it offers a $5 monthly credit. For a single user, this should be more than enough.
For this reason Icarus uses FlightAware API as last resort or with a heavy rate limiter.
In the Preferences you can set the API key and track the usage.

### OpenSky - API key not required
OpenSky is a free service that provides adsb data. Icarus mainly calls OpenSky to fetch nearby aircraft in the radar. 
OpenSky, if used without an API key, has a tier of 400 requests per day, which is enough for a limited usage of the radar (roughly 3 hours with a refresh rate of 30seconds).
However, you can register a free OpenSky account and get an API key (which you can set in the Preferences section) and extend the tier to 4000 requests per day (more than 30 hours of refreshes).

### ADSB.lol - API key not required
Adsb.lol is an amazing open-source project, (go check it out!) and it's used as the main source for the radar flights routes information. 
It doesn't require an API key, and it's free to use.

### adsbdb.com - API key not required
adsbdb.com is another amazing open-source project, (go check it out as well!) and it's used to retrieve aircraft specific information (such as registration, manufacturer, etc.). 
It doesn't require an API key, and it's free to use.

### JetPhotos and FlightRadar24 - API key not required
These two services are used to retrieve aircraft images. They do not offer a public API hence I needed to find an easy way to access their publicly available data, I found jetapi.dev (https://www.jetapi.dev/), 
however it didn't offer an easy way to integrate it, so I Dockerized it (https://github.com/gabrielebellani/jetapi_scraper_docker).
It doesn't require an API key, and it's free to use.

### Note on third party services usage and data accuracy
Icarus infers itself a quite strict rate limit on third party calls, the reason is to prevent being banned by the third party services and to ensure that their servers are not overloaded.

Data accuracy is not guaranteed, these services are not always 100% accurate, and Icarus cannot be held responsible for any data inaccuracies. 
Sometimes, if you compare displayed information with FlightRadar24 or other (paid) similar services, you may notice discrepancies.

_Note:_ if you want to add other data sources, please open an issue or a pull request.

## Installation (Docker)

### Prerequisites

- Docker and Docker Compose installed

### Quick Start

1. **Clone or download the repository**:
   ```bash
   git clone https://github.com/gabrielebellani/icarus.git
   cd icarus
   ```

2. **Copy `.env` file from the example**:
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` with your configuration**:
    - Set secure `SUPERUSER_PASSWORD` and `JWT_SECRET`
    - Update `FRONTEND_URL` if accessing from a different hostname/domain

4. **Start the services**:
   ```bash
   docker compose up -d
   ```

5. **Access the application**:
    - Open `http://localhost:8920` (or your configured `FRONTEND_PORT`)
    - Log in with username `admin` and the password from `.env`

### Environment Variables

| Variable               | Required | Default                      | Description                                 |
|------------------------|----------|------------------------------|---------------------------------------------|
| `SUPERUSER_USERNAME`   | Yes      | `admin`                      | Initial admin username                      |
| `SUPERUSER_PASSWORD`   | Yes      | -                            | Initial admin password (change this!)       |
| `JWT_SECRET`           | Yes      | -                            | Secret for JWT token signing (min 32 chars) |
| `FRONTEND_URL`         | No       | `http://localhost:8920`      | Public URL for password recovery messages   |
| `FRONTEND_PORT`        | No       | `8920`                       | Port to expose the frontend on the host     |
| `DB_PATH`              | No       | `/app/data/icarus-db.sqlite` | Path to the SQLite database                 |
| `DISABLE_REGISTRATION` | No       | `true`                       | Set to `false` to allow user registration   |
| `SMTP_HOST`            | No       | -                            | SMTP server host for password recovery emails |
| `SMTP_PORT`            | No       | -                            | SMTP server port                            |
| `SMTP_SECURE`          | No       | `false`                      | Use TLS for the SMTP connection             |
| `SMTP_USER`            | No       | -                            | SMTP auth username                          |
| `SMTP_PASSWORD`        | No       | -                            | SMTP auth password                          |
| `SMTP_FROM`            | No       | -                            | "From" address for password recovery emails |

> Note: password recovery is only available when all `SMTP_*` variables are
> set; otherwise the recovery endpoint stays disabled.

## Installation (integrate in existing Docker Compose setup)

If you already run other services with Docker Compose, you can integrate Icarus by adding these services to your
existing `docker-compose.yml`:

```yaml
services:
  icarus-frontend:
    image: ghcr.io/gabrielebellani/icarus-frontend:latest
    ports:
      - "8920:8920"
    depends_on:
      icarus-backend:
        condition: service_healthy
    networks:
      - your-network

  icarus-backend:
    image: ghcr.io/gabrielebellani/icarus-backend:latest
    environment:
      PORT: "8921"
      SUPERUSER_USERNAME: admin
      SUPERUSER_PASSWORD: ${ICARUS_PASSWORD}
      JWT_SECRET: ${ICARUS_JWT_SECRET}
      JETAPI_URL: http://jetapi:8922
      DB_PATH: /app/data/icarus-db.sqlite
    volumes:
      - icarus-db:/app/data
    depends_on:
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

## Development

### Local Development Setup

For development, you'll need Node.js/Bun and you can also use the local dev environment without Docker:

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

Runs on `http://localhost:8921` with local SQLite.

### Testing

Backend tests use Bun's built-in test runner. They run against an in-memory SQLite database and
mock every third-party provider, so no network access or API key is needed:

```bash
cd backend
bun test
```

## Architecture breakdown

```
┌─────────────────────────────────┐
│   Frontend (Caddy + SPA)        │
│  • Vue 3 + TypeScript + Vite    │
│  • Tailwind + shadcn-vue        │
└──────────────┬──────────────────┘
               │
               │
┌──────────────▼──────────────────┐
│      Backend (Bun + SQLite)     │
│  • REST API + WebSocket server  │
│  • User authentication          │
│  • Flight tracking logic        │
└──────────────┬──────────────────┘
               │
            SQLite

```

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
│   ├── docs/               # Frontend notes
│   ├── Dockerfile          # Multi-stage build (bun + Caddy)
│   └── docker/
│       └── Caddyfile       # Reverse proxy config
│
├── backend/                 # Bun server
│   ├── controllers/        # Request handlers
│   ├── services/           # Business logic
│   ├── repositories/       # Data access layer
│   ├── middleware/         # Auth & request processing
│   ├── migrations/         # Database schema
│   ├── utils/              # Helpers (env, jwt, email, etc.)
│   ├── tests/              # bun test suites
│   ├── Dockerfile          # Production image
│   └── index.ts            # Server entry point
│
├── docker-compose.yml      # Production orchestration
├── .env.example            # Configuration template
└── README.md              # This file
```

## Key Technologies

- **Frontend**: Vue 3, TypeScript, Tailwind CSS, shadcn-vue, Leaflet maps, Vite
- **Backend**: Bun (TypeScript runtime), SQLite
- **Deployment**: Docker, Docker Compose, Caddy
- **Authentication**: JWT tokens, password recovery

## Security Considerations

- **Always** change `SUPERUSER_PASSWORD` and `JWT_SECRET` in production
- Set `FRONTEND_URL` to your actual domain for working password recovery links
- Consider using a reverse proxy for HTTPS/TLS
- Keep Docker images updated regularly

## Roadmap/improvements ideas
- [ ] third party services status diagram
- [ ] add support for ADS-B antennas
- [ ] admin can create user's accounts and send them an invitation
- [ ] shared admin third parties API keys
- [ ] push/webhook notifications for tracked flight events (takeoff, landing, delays)
- [ ] personal flight history/logbook with stats on past tracked flights
- [ ] METAR/TAF weather overlay on airport timetables
- [ ] shared radar/route cache across users to reduce OpenSky/FlightAware API usage

## License

Licensed under the [AGPL-3.0 License](LICENSE).

## Contributing

Contributions welcome! Please open issues and pull requests on GitHub.