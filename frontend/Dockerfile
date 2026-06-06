FROM oven/bun:1 AS base
WORKDIR /app

# Install deps first for layer caching.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

# NEXT_PUBLIC_* is inlined into the client bundle at build time, so the URL the
# browser uses must be known here (not at runtime). The server-side INTERNAL_API_URL
# is read at runtime from the environment (see docker-compose.yml and src/lib/api.ts).
ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN bun run build

EXPOSE 3000
# Bind to all interfaces so the published port is reachable from the host.
CMD ["bun", "x", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
