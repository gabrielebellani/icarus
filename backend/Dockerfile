FROM oven/bun:1-slim

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --production

COPY . .

# Production: run without --watch
ENTRYPOINT ["bun", "run", "index.ts"]
