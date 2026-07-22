# Build stage
FROM oven/bun:1-slim as builder

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install

COPY . .

RUN bun run build

# Production stage
FROM caddy:2-alpine

# Copy the built SPA from the builder stage
COPY --from=builder /app/dist /srv

# Copy custom Caddy configuration
COPY docker/Caddyfile /etc/caddy/Caddyfile

EXPOSE 80
