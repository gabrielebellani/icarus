FROM oven/bun:1-slim

WORKDIR /app

# Install curl for healthchecks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./

RUN bun install --production

COPY . .

# Production: run without --watch
ENTRYPOINT ["bun", "run", "index.ts"]
