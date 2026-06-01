# HabitForge

A small, single-user habit tracker built to learn **Go** and **TypeScript** end to end — not by cloning a finished app, but by typing it out chapter by chapter and meeting the idioms of each ecosystem honestly.

You create habits (e.g. *"read 20 pages"*, *"no caffeine after noon"*), check them off each day or week, and the app tracks your streak. The domain is deliberately tiny; the point is the engineering, not the novelty.

> 🚧 **Work in progress.** This is a learning project following a guided build. The backend HTTP + persistence layer is functional; streak logic and the frontend UI are still being built out.

## Why this exists

The goal is to internalize how real services are structured: a clean separation between HTTP transport, domain logic, and data access — using a **repository pattern** behind a narrow interface, dependencies injected at a single composition root, and errors that carry context across layer boundaries.

## Architecture

```
HTTP request
   │
   ▼
 router.go   ──►  handlers (transport: chi, JSON, status codes)
   │
   ▼
 Store        ──►  interface (the contract — hides storage entirely)
   │
   ▼
 SQLiteStore  ──►  implementation (sqlc-generated queries + SQLite)
```

Handlers depend on the `Store` *interface*, never on SQLite directly — which keeps the transport layer testable and the storage swappable.

## Tech stack

| Layer | Tools |
|-------|-------|
| Backend | Go, [chi](https://github.com/go-chi/chi) (routing), [sqlc](https://sqlc.dev) (typed queries), [modernc.org/sqlite](https://pkg.go.dev/modernc.org/sqlite) (pure-Go SQLite, no cgo) |
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS |
| Tooling | [mise](https://mise.jdx.dev) for runtime versions (Go, Node, Bun) |

## Project layout

```
habitforge/
├── backend/
│   ├── cmd/server/         # main.go — the composition root
│   ├── internal/
│   │   ├── httpapi/         # router.go (wiring) + handlers.go (behavior)
│   │   ├── store/           # Store interface + SQLite implementation
│   │   │   └── gen/         # sqlc-generated code
│   │   └── habit/           # domain logic (streak rules)
│   └── migrations/          # SQL schema
├── frontend/                # Next.js app
└── habitforge-guide.md      # the full build walkthrough
```

## Getting started

### Backend

```bash
cd backend
go run ./cmd/server          # serves on :8080 (override with HABIT_FORGE_ADDR)
```

The SQLite database (`habitforge.db`) is created on first run.

### Frontend

```bash
cd frontend
npm install
npm run dev                  # http://localhost:3000
```

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/healthz` | Liveness check |
| `GET`  | `/api/habits` | List all habits |
| `POST` | `/api/habits` | Create a habit (`{"name","schedule"}`, schedule = `daily`\|`weekly`) |
| `GET`  | `/api/habits/{id}` | Get one habit (404 if missing) |
| `DELETE` | `/api/habits/{id}` | Delete a habit (204) |
| `POST` | `/api/habits/{id}/checkins` | Record a check-in for today (server-owned clock) |

### Example

```bash
curl -s -X POST localhost:8080/api/habits -d '{"name":"Read","schedule":"daily"}'
# {"id":1,"name":"Read","schedule":"daily","createdAt":"2026-06-01T01:27:41Z"}

curl -s localhost:8080/api/habits/1
curl -s -X POST localhost:8080/api/habits/1/checkins -i   # 201 Created
```

## License

See [LICENSE](LICENSE).
