FROM oven/bun:1-slim

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install

COPY . .

ENTRYPOINT ["bun", "--watch", "run", "src/index.ts"]
