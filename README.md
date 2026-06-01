# HabitForge

> Build a real app, learn Go and TypeScript.

HabitForge is a small, single-user habit tracker built as a complete, guided walkthrough of the **Go** and **Next.js (TypeScript)** ecosystems — written for people who have not used either language before. You create habits (*"read 20 pages"*, *"no caffeine after noon"*), mark them done each day or week, and the app shows your current streak for each one.

It is deliberately small. The objective is not novelty — it is enough surface area to meet the idioms each ecosystem expects from you, honestly.

> The full build is documented chapter by chapter in **[habitforge-guide.md](habitforge-guide.md)**. The value is in the keystrokes: the guide is meant to be *typed out*, not cloned.

## The architecture

Conventional and boring on purpose:

```
+------------------+         HTTP/JSON         +------------------+
|  Next.js client  |  <--------------------->  |   Go HTTP server |
|  (TypeScript)    |                           |  (chi + sqlc)    |
+------------------+                           +------------------+
                                                       |
                                                       v
                                                  +----------+
                                                  |  SQLite  |
                                                  +----------+
```

The Go server owns the data and the rules. The Next.js app calls it over HTTP. **Types are generated from Go to TypeScript**, so the client cannot drift from the server.

Internally the backend keeps a clean separation between transport (chi handlers), domain logic (streak rules), and data access (a `Store` interface implemented over SQLite) — the repository pattern behind a narrow interface, with dependencies wired at a single composition root.

## Why these tools

- **Go** was designed for backend services and reads as if it wants to be boring — and that is a feature. An unusually good standard library, errors as values rather than exceptions, concurrency built into the language, and exactly one accepted way to format code.
- **Next.js + TypeScript** is the dominant way to ship a typed React frontend today. The App Router (server components by default, client components opt-in) pushes you toward fetching data close to where it is rendered and shipping less JavaScript.
- **SQLite** requires zero setup, runs in a single file, and is perfectly capable for any side project. Swap it for PostgreSQL later with a few line changes if you outgrow it.

> **Principle.** Pick boring tools you can debug. Novelty has a maintenance cost, and you pay it alone at 11pm.

## What you learn

**Backend:** how a Go program and its modules are structured, how to write idiomatic handlers, how to talk to a SQL database with generated code (sqlc), how to write table-driven tests, and what mutation testing actually proves.

**Frontend:** how the App Router differs from older React mental models, data fetching with TanStack Query, form validation with Zod, and testing components without coupling tests to implementation.

**Beyond the monolith:** when (and when not) to decompose into services, extracting an analytics service, and adding a gateway with observability.

## The guide

The walkthrough runs in 19 chapters:

| Chapters | Topic |
|----------|-------|
| 1–4   | What you're building, setting up Go and Node from zero, designing the domain |
| 5–7   | Backend: HTTP & routing with chi, persistence with SQLite + sqlc, streak logic |
| 8–9   | Unit testing in Go, mutation testing with gremlins |
| 10    | Generating the API contract with tygo (Go → TypeScript) |
| 11–13 | Frontend: the App Router, data fetching with TanStack Query, forms & validation |
| 14–15 | Unit testing with Vitest, mutation testing with Stryker |
| 16    | Wiring it all together |
| 17–19 | Deciding to decompose into services, extracting analytics, gateway & observability |

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
├── frontend/                # Next.js app (App Router, TypeScript, Tailwind)
└── habitforge-guide.md      # the full chapter-by-chapter walkthrough
```

## Getting started

Tool versions are pinned per-repo with [mise](https://mise.jdx.dev) (`.mise.toml`):

```bash
mise install        # installs the pinned Go, Node, and Bun
```

### Backend

```bash
cd backend
go run ./cmd/server          # serves on :8080 (override with HABIT_FORGE_ADDR)
```

The SQLite database (`habitforge.db`) is created on first run.

### Frontend

```bash
cd frontend
bun install
bun run dev                  # http://localhost:3000
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

```bash
curl -s -X POST localhost:8080/api/habits -d '{"name":"Read","schedule":"daily"}'
# {"id":1,"name":"Read","schedule":"daily","createdAt":"2026-06-01T01:27:41Z"}
```

## License

See [LICENSE](LICENSE).
