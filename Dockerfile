FROM oven/bun:1-slim

WORKDIR /app

COPY package.json bun.lock ./
COPY .env.example ./.env
COPY src ./

RUN bun install

EXPOSE ${PORT:-3000}

ENTRYPOINT ["bun", "run", "index.ts"]
