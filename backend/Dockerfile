# --- build stage ---
FROM golang:1.25-alpine AS build
WORKDIR /src

# Cache modules first.
COPY go.mod go.sum ./
RUN go mod download

COPY . .
# modernc.org/sqlite is pure Go, so we can build a static binary with no CGO.
RUN CGO_ENABLED=0 go build -trimpath -o /out/server ./cmd/server

# --- runtime stage ---
FROM alpine:3.20
WORKDIR /app

# wget (for the healthcheck) and ca-certs ship in alpine's busybox base already.
COPY --from=build /out/server /app/server
# OpenSQLite reads migrations/0001_init.sql relative to the working directory.
COPY migrations /app/migrations

# Data lives outside the image so it survives rebuilds (see docker-compose.yml).
ENV HABIT_FORGE_DB=/data/habitforge.db
RUN mkdir -p /data

EXPOSE 8080
CMD ["/app/server"]
