# HabitForge: Build a Real App, Learn Go and TypeScript

A complete walkthrough of building a small habit tracker with a Go backend and a Next.js (TypeScript) frontend. Written for people who have not used either language before. The goal is not to copy code, it is to internalise the idioms and principles each ecosystem expects from you.

## How to read this guide

Type everything yourself. Read the prose before the code. When a "Principle" callout appears, stop and make sure you understand why it is being recommended before you continue. Each chapter ends with a short exercise. Do the exercise before moving on, even if it feels obvious.

The full source code is something you will produce by following along. Resist the urge to clone a finished version, because the value is in the keystrokes and the typos and the looking up of error messages.

## Table of contents

1. What you are building and why
2. Setting up Go from zero
3. Setting up Node and Next.js from zero
4. Designing the domain
5. Backend part 1: HTTP and routing with chi
6. Backend part 2: persistence with SQLite and sqlc
7. Backend part 3: streak logic
8. Unit testing in Go
9. Mutation testing in Go with gremlins
10. Generating the API contract with tygo
11. Frontend part 1: pages and the App Router
12. Frontend part 2: data fetching with TanStack Query
13. Frontend part 3: forms and validation
14. Unit testing in TypeScript with Vitest
15. Mutation testing in TypeScript with Stryker
16. Wiring it all together and where to go next
17. Deciding to decompose into services
18. Extracting the analytics service
19. The gateway, observability, and running it all

---

## Chapter 1: What you are building and why

HabitForge is a single-user habit tracker. You create habits ("read 20 pages", "no caffeine after noon"), mark them as done each day or each week, and the app shows your current streak for each one. It is deliberately small. The objective is not novelty, it is to give you enough surface area to meet the idioms of both languages honestly.

The architecture is conventional and boring on purpose:

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

The Go server owns the data and the rules. The Next.js app calls it over HTTP. Types are generated from Go to TypeScript so the client cannot drift from the server.

### Why these tools

Go was designed for backend services and reads as if it wants to be boring. That is a feature. The standard library is unusually good, errors are values rather than exceptions, concurrency is built into the language, and there is exactly one accepted way to format code. You will spend less time arguing about style and more time reading what code does.

Next.js with TypeScript is the dominant way to ship a typed React frontend today. The App Router model (server components by default, client components opt-in) is unusual at first if you come from a different ecosystem, but it pushes you toward fetching data close to where it is rendered and shipping less JavaScript.

SQLite is used because it requires zero setup, runs in a single file, and is perfectly capable for any side project. You can swap it for PostgreSQL later with a few line changes if you outgrow it.

### What you will know by the end

How a Go program is structured, how Go modules work, how to write idiomatic handlers, how to talk to a SQL database with generated code, how to write table-driven tests, and what mutation testing actually proves. On the frontend, how the App Router differs from older React mental models, how to use TanStack Query, how to validate forms with Zod, and how to test components without coupling tests to implementation.

**Principle.** Pick boring tools you can debug. Novelty has a maintenance cost, and you pay it alone at 11pm.

---

## Chapter 2: Setting up Go from zero

### Installing Go via mise

We will use [mise](https://mise.jdx.dev) to manage tool versions throughout this guide. It handles Go, Node, and dozens of other runtimes from a single config file at the project root. One tool replaces `asdf`, `fnm`, `nvm`, `pyenv`, and `goenv`.

Install mise (one line on macOS or Linux):

```bash
curl https://mise.run | sh
```

Add the shell hook per the install output (one line in your `.zshrc` or `.bashrc`). Restart your shell.

Create the project root and pin Go:

```bash
mkdir habitforge
cd habitforge
cat > .mise.toml <<'EOF'
[tools]
go = "1.23"
EOF
mise trust
mise install
go version
```

`mise trust` tells mise this `.mise.toml` is safe to read (mise refuses to load configs from untrusted directories, which is good security hygiene). `mise install` then reads the file and installs the pinned Go version. From now on, whenever you `cd` into `habitforge/`, mise activates that Go automatically.

Other contributors clone the repo, run `mise install` once, and get the same toolchain. No global Go, no version drift.

**Principle.** Pin tool versions per repository, not per machine. A version manager configured globally is a bug factory across projects.

### The tooling, briefly

You will interact with Go primarily through these commands:

- `go run ./cmd/server` runs a program without producing a binary on disk
- `go build ./cmd/server` produces a binary
- `go test ./...` runs all tests in the current module
- `go fmt ./...` formats every file in the module
- `go vet ./...` runs a suite of static checks
- `go mod tidy` reconciles your dependencies with what your code actually imports

You should run `go fmt` and `go vet` constantly. Most editors do it on save.

**Principle.** Formatting is not a preference in Go. There is one canonical layout and `gofmt` produces it. Stop thinking about indentation. Spend that attention elsewhere.

### Editor setup

Install the official Go extension for VS Code, or set up `gopls` (the language server) in whichever editor you prefer. You want autocomplete, jump-to-definition, format-on-save, and inline error reporting. Without these you will be miserable.

### Modules and project layout

A Go module is a unit of versioning. Every project has a `go.mod` file at its root. Create the backend module:

```bash
# from the habitforge/ project root
mkdir -p backend
cd backend
go mod init github.com/yourname/habitforge/backend
```

The module path does not have to correspond to a real GitHub repository, but using a host-style path is convention because it disambiguates packages when others import your code.

The layout we will use for the backend:

```
backend/
  cmd/
    server/
      main.go
  internal/
    habit/
      habit.go
      streak.go
      streak_test.go
    store/
      store.go
      sqlite.go
    http/
      router.go
      handlers.go
  migrations/
    0001_init.sql
  sqlc.yaml
  go.mod
```

`cmd/` holds executables. Each subdirectory of `cmd/` becomes a separate binary. `internal/` is special in Go: packages under `internal/` can only be imported by code in the parent module, which means you can refactor freely without worrying about external callers.

**Principle.** Use `internal/` aggressively. Code that is not part of your public API belongs there, and Go enforces the boundary for you.

### Your first program

Create `backend/cmd/server/main.go`:

```go
package main

import (
	"fmt"
	"net/http"
)

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "habitforge")
	})

	fmt.Println("listening on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		fmt.Println("server error:", err)
	}
}
```

Run it with `go run ./cmd/server` and open http://localhost:8080. A few things to notice. Every file begins with a `package` declaration. The entry point of a binary is `package main` with a `func main()`. Imports are explicit and unused imports are a compile error, not a warning. That last detail is intentional: it makes dead code obvious.

Notice the error handling. `http.ListenAndServe` returns an `error`. We check it explicitly. There is no `try/catch`. The Go convention is that any function that can fail returns an `error` as its last return value, and the caller is expected to inspect it.

**Principle.** Handle errors where they happen, or wrap them with context and return them upward. Never ignore them silently. The shortcut `_ = someCall()` is allowed but should make you uncomfortable.

### Exercise

Modify the program so it returns the current time at `/time`. Use the `time` package. Make sure `go vet ./...` is clean.

---

## Chapter 3: Setting up Node and Next.js from zero

### Installing Node and Bun via mise

We already have mise installed from Chapter 2. Add Node and Bun to the project's `.mise.toml` at the repository root:

```toml
[tools]
go = "1.23"
node = "20"
bun = "latest"
```

Then from the repository root:

```bash
mise install
node --version
bun --version
```

Bun is two things at once: a JavaScript runtime and a package manager. We will use it as the package manager and script runner throughout this guide. Where Node and Next.js are concerned, Bun ships drop-in replacements for `npm install`, `npm run`, and friends, but it installs faster and produces a deterministic lockfile.

We are not using Bun as the production runtime for Next.js in this guide. Bun-on-Next.js works in 2026, but Node remains the path with the fewest sharp edges. If you want to try Bun as the runtime later, the swap is a one-line change.

### Bootstrapping the Next.js app

From the repository root (one level above `backend/`):

```bash
bun create next-app@latest frontend
```

Answer the prompts:

- TypeScript: Yes
- ESLint: Yes
- Tailwind: Yes
- `src/` directory: Yes
- App Router: Yes
- Turbopack: Yes (it is the default in Next.js 15)
- Import alias: keep the default `@/*`

If the prompt asks which package manager to use, choose Bun.

Then:

```bash
cd frontend
bun dev
```

Open http://localhost:3000. You should see the default Next.js page. Stop the server with Ctrl-C.

### TypeScript strictness

Open `frontend/tsconfig.json`. You want `"strict": true` (Next.js sets this by default). Strict mode is non-negotiable for learning. It catches the entire category of "I forgot a thing is possibly undefined" mistakes that plague untyped JavaScript codebases.

Verify a few flags are on:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true
  }
}
```

`noUncheckedIndexedAccess` is the one most projects forget to enable. It forces you to acknowledge that `array[0]` might be undefined. This is correct. Indexing past the end of an array in untyped JavaScript returns undefined, and the type system should reflect that.

**Principle.** Strict mode is the easiest decision you will make. Turn on every reasonable strict flag at the start of a project. Adding strictness later costs orders of magnitude more time.

### Linting and formatting

Next.js ships with ESLint configured. For formatting, install Prettier:

```bash
bun add -D prettier
```

Create `frontend/.prettierrc.json`:

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all"
}
```

Run `bunx prettier --write .` before commits, or wire it into your editor. `bunx` is Bun's equivalent of `npx`: it runs an installed binary without you having to remember its exact path inside `node_modules`.

### The App Router mental model

The crucial idea: by default, files in `app/` are React Server Components. They run on the server only and never ship JavaScript to the browser. To opt a component into being a Client Component (state, effects, event handlers), add `'use client'` at the top of the file.

This is the opposite of older React projects where everything ran in the browser. The benefits: less JavaScript shipped, faster initial loads, and you can fetch data directly inside a component without a separate API layer.

**Principle.** Keep client components small and at the leaves of the tree. The server should render as much as possible.

### Exercise

Edit `frontend/src/app/page.tsx` to display "HabitForge" as a heading. Run `bun dev` and confirm it appears. Then turn on `noUncheckedIndexedAccess` if it is not on, and resolve any errors that appear.

---

## Chapter 4: Designing the domain

Before writing the database, write the rules in English. If you cannot state the rules clearly, no amount of code will save you.

### Entities

A **Habit** is something the user wants to track. It has a name, a schedule (daily or weekly), and a creation date.

A **CheckIn** is a record that a habit was done on a particular date. It belongs to exactly one habit.

### Rules

- A habit's schedule is one of: `daily`, `weekly`.
- Each habit has at most one check-in per day (for daily habits) or per ISO week (for weekly habits).
- The **current streak** is the count of consecutive periods up to and including today (or this week) in which the habit has a check-in.
- For daily habits, a missed day breaks the streak.
- For weekly habits, a missed ISO week breaks the streak.
- "Today" is computed in UTC. (For a real product you would store a user timezone. We are skipping that complexity, but document the assumption so we can fix it later.)

This is the kind of specification that mutation testing rewards. There are at least four ways to write the streak logic that all pass naive tests and silently disagree at boundaries.

### Data model

```
habits
  id            INTEGER PRIMARY KEY
  name          TEXT NOT NULL
  schedule      TEXT NOT NULL CHECK (schedule IN ('daily','weekly'))
  created_at    TEXT NOT NULL

check_ins
  id            INTEGER PRIMARY KEY
  habit_id      INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE
  occurred_on   TEXT NOT NULL  -- ISO 8601 date
  UNIQUE(habit_id, occurred_on)
```

We store dates as ISO 8601 strings in SQLite because it has no native date type and strings sort correctly when formatted this way.

**Principle.** Model the domain in plain language first. Code is the second translation. Database schema is the third. If the domain is muddled, the rest will be muddled.

### Exercise

Write down on paper, in your own words, what the streak should be for the following sequences of check-ins for a daily habit, given today is 2026-05-19:

- `[2026-05-19, 2026-05-18, 2026-05-17]`
- `[2026-05-18, 2026-05-17]`
- `[2026-05-19, 2026-05-17]`
- `[]`

Keep your answers. You will use them as test cases in Chapter 8.

---

## Chapter 5: Backend part 1, HTTP and routing with chi

### Why chi

The Go standard library is enough to build a server. But for anything bigger than a toy, you want a router that understands path parameters, middleware composition, and route grouping. `chi` is the most idiomatic choice. It implements `http.Handler` from the standard library, which means everything you learn in `net/http` transfers directly.

Add it:

```bash
cd backend
go get github.com/go-chi/chi/v5
```

### A clean main

Replace `cmd/server/main.go`:

```go
package main

import (
	"log"
	"net/http"
	"os"

	"github.com/yourname/habitforge/backend/internal/httpapi"
)

func main() {
	addr := os.Getenv("HABITFORGE_ADDR")
	if addr == "" {
		addr = ":8080"
	}

	r := httpapi.NewRouter()

	log.Printf("listening on %s", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("server: %v", err)
	}
}
```

A few principles already visible. `main` does the absolute minimum: read config, build a router, listen. Configuration comes from the environment, not from a file we have to ship. Logging goes through the standard `log` package for now. Everything else lives behind a constructor in another package.

**Principle.** `main` is plumbing. Push logic into packages that can be tested. A 200-line `main` is a code smell.

### The router

Create `backend/internal/httpapi/router.go`:

```go
package httpapi

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func NewRouter() http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(15 * time.Second))

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	return r
}
```

Run `go mod tidy` to pull in the chi dependency, then `go run ./cmd/server`. Visit http://localhost:8080/healthz. You should see `ok` and the server should have logged the request.

### Handler shape

A Go HTTP handler is anything implementing `http.Handler`:

```go
type Handler interface {
    ServeHTTP(w http.ResponseWriter, r *http.Request)
}
```

In practice, you write `func(w http.ResponseWriter, r *http.Request)` and let `http.HandlerFunc` adapt it. The signature is uniform across every router and middleware in the ecosystem.

### Encoding JSON

Create `backend/internal/httpapi/handlers.go`:

```go
package httpapi

import (
	"encoding/json"
	"net/http"
)

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		// At this point the status line is already written. The best we
		// can do is log; the connection is effectively broken.
		// In a real app we'd use a structured logger via context.
	}
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
```

**Principle.** Use small helpers at the edges. Every handler should not have to remember to set Content-Type and call Encode in the right order.

### Wiring up habit endpoints (stub)

We will fill these in once persistence exists. For now, sketch the routes so the shape is visible:

```go
// add inside NewRouter() before the return
r.Route("/api/habits", func(r chi.Router) {
    r.Get("/", listHabits)
    r.Post("/", createHabit)
    r.Get("/{id}", getHabit)
    r.Delete("/{id}", deleteHabit)
    r.Post("/{id}/checkins", createCheckIn)
})
```

And the handler stubs:

```go
func listHabits(w http.ResponseWriter, r *http.Request)    { writeError(w, http.StatusNotImplemented, "soon") }
func createHabit(w http.ResponseWriter, r *http.Request)   { writeError(w, http.StatusNotImplemented, "soon") }
func getHabit(w http.ResponseWriter, r *http.Request)      { writeError(w, http.StatusNotImplemented, "soon") }
func deleteHabit(w http.ResponseWriter, r *http.Request)   { writeError(w, http.StatusNotImplemented, "soon") }
func createCheckIn(w http.ResponseWriter, r *http.Request) { writeError(w, http.StatusNotImplemented, "soon") }
```

Run the server, hit `curl http://localhost:8080/api/habits`, confirm you see the JSON error.

### Exercise

Add a middleware that sets a custom `X-App` header with value `habitforge` on every response. Write it as a function returning `func(http.Handler) http.Handler` (the standard middleware shape). Wire it in with `r.Use(...)`. Confirm the header appears with `curl -i`.

---

## Chapter 6: Backend part 2, persistence with SQLite and sqlc

### What sqlc does

You write SQL by hand. `sqlc` reads your schema and queries and generates type-safe Go code that wraps them. The result: no ORM, no string concatenation, no runtime reflection. You get autocomplete on rows and compile errors when columns change.

Install the CLI:

```bash
brew install sqlc
# or: go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
```

### The SQL driver

We will use `modernc.org/sqlite`, a pure-Go SQLite driver that does not require CGO:

```bash
go get modernc.org/sqlite
```

### Migration

Create `backend/migrations/0001_init.sql`:

```sql
CREATE TABLE habits (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    schedule    TEXT NOT NULL CHECK (schedule IN ('daily','weekly')),
    created_at  TEXT NOT NULL
);

CREATE TABLE check_ins (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id     INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    occurred_on  TEXT NOT NULL,
    UNIQUE(habit_id, occurred_on)
);
```

For learning, we will apply this manually on startup. In a production codebase you would use a migration tool like `goose` or `golang-migrate`. Both are worth learning later.

### sqlc config and queries

Create `backend/sqlc.yaml`:

```yaml
version: "2"
sql:
  - engine: "sqlite"
    queries: "internal/store/queries.sql"
    schema: "migrations/0001_init.sql"
    gen:
      go:
        package: "store"
        out: "internal/store/gen"
        sql_package: "database/sql"
```

Create `backend/internal/store/queries.sql`:

```sql
-- name: CreateHabit :one
INSERT INTO habits (name, schedule, created_at)
VALUES (?, ?, ?)
RETURNING id, name, schedule, created_at;

-- name: ListHabits :many
SELECT id, name, schedule, created_at FROM habits ORDER BY id;

-- name: GetHabit :one
SELECT id, name, schedule, created_at FROM habits WHERE id = ?;

-- name: DeleteHabit :exec
DELETE FROM habits WHERE id = ?;

-- name: CreateCheckIn :exec
INSERT OR IGNORE INTO check_ins (habit_id, occurred_on) VALUES (?, ?);

-- name: ListCheckIns :many
SELECT occurred_on FROM check_ins WHERE habit_id = ? ORDER BY occurred_on DESC;
```

Run `sqlc generate` from `backend/`. Inspect the files in `internal/store/gen/`. You will see typed `Habit`, `CreateHabitParams`, and methods like `Queries.CreateHabit(ctx, params)`.

### The Store interface

We do not want our handlers to depend on the generated code directly. We define a narrow interface that captures only what we need.

Create `backend/internal/store/store.go`:

```go
package store

import (
	"context"
	"time"
)

type Habit struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Schedule  string    `json:"schedule"`
	CreatedAt time.Time `json:"createdAt"`
}

type Store interface {
	CreateHabit(ctx context.Context, name, schedule string) (Habit, error)
	ListHabits(ctx context.Context) ([]Habit, error)
	GetHabit(ctx context.Context, id int64) (Habit, error)
	DeleteHabit(ctx context.Context, id int64) error
	CreateCheckIn(ctx context.Context, habitID int64, day time.Time) error
	ListCheckIns(ctx context.Context, habitID int64) ([]time.Time, error)
}
```

**Principle.** Define interfaces in the package that uses them, with only the methods that package needs. Do not export a 30-method interface "for completeness". Small interfaces compose, big interfaces ossify.

### The SQLite implementation

Create `backend/internal/store/sqlite.go`. This file wraps the generated code and converts between SQL row types and our domain types.

```go
package store

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"time"

	gen "github.com/yourname/habitforge/backend/internal/store/gen"
	_ "modernc.org/sqlite"
)

type SQLiteStore struct {
	db *sql.DB
	q  *gen.Queries
}

func OpenSQLite(path string) (*SQLiteStore, error) {
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}
	if _, err := db.Exec("PRAGMA foreign_keys = ON;"); err != nil {
		return nil, fmt.Errorf("enable foreign keys: %w", err)
	}
	schema, err := os.ReadFile("migrations/0001_init.sql")
	if err != nil {
		return nil, fmt.Errorf("read schema: %w", err)
	}
	if _, err := db.Exec(string(schema)); err != nil {
		// If the table already exists this returns an error. For a
		// learning project we ignore it. A real project uses a
		// migration tool.
	}
	return &SQLiteStore{db: db, q: gen.New(db)}, nil
}

const dateFmt = "2006-01-02"

func (s *SQLiteStore) CreateHabit(ctx context.Context, name, schedule string) (Habit, error) {
	row, err := s.q.CreateHabit(ctx, gen.CreateHabitParams{
		Name:      name,
		Schedule:  schedule,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	})
	if err != nil {
		return Habit{}, fmt.Errorf("create habit: %w", err)
	}
	t, _ := time.Parse(time.RFC3339, row.CreatedAt)
	return Habit{ID: row.ID, Name: row.Name, Schedule: row.Schedule, CreatedAt: t}, nil
}

func (s *SQLiteStore) ListHabits(ctx context.Context) ([]Habit, error) {
	rows, err := s.q.ListHabits(ctx)
	if err != nil {
		return nil, fmt.Errorf("list habits: %w", err)
	}
	out := make([]Habit, 0, len(rows))
	for _, r := range rows {
		t, _ := time.Parse(time.RFC3339, r.CreatedAt)
		out = append(out, Habit{ID: r.ID, Name: r.Name, Schedule: r.Schedule, CreatedAt: t})
	}
	return out, nil
}

// GetHabit, DeleteHabit, CreateCheckIn, ListCheckIns: write these
// yourself, following the same pattern. This is the exercise.
```

Notice `fmt.Errorf("...: %w", err)`. The `%w` verb wraps the original error so callers can use `errors.Is` and `errors.As` to inspect it. Always wrap with context when returning errors across package boundaries.

**Principle.** An error message should be a breadcrumb trail. By the time it reaches the user, the chain should read like a stack trace in plain English.

### Filling in the handlers

Update `backend/internal/httpapi/router.go` to accept a store, then update handlers. Sketch:

```go
type API struct {
	Store store.Store
}

func NewRouter(api *API) http.Handler {
	r := chi.NewRouter()
	// ... middleware ...
	r.Route("/api/habits", func(r chi.Router) {
		r.Get("/", api.listHabits)
		r.Post("/", api.createHabit)
		// ...
	})
	return r
}

func (a *API) listHabits(w http.ResponseWriter, r *http.Request) {
	habits, err := a.Store.ListHabits(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list habits")
		return
	}
	writeJSON(w, http.StatusOK, habits)
}
```

And `main.go` wires them together:

```go
s, err := store.OpenSQLite("habitforge.db")
if err != nil {
    log.Fatalf("open store: %v", err)
}
r := httpapi.NewRouter(&httpapi.API{Store: s})
```

### Exercise

Implement `createHabit`. It should parse JSON with fields `name` and `schedule`, validate that `schedule` is either `daily` or `weekly`, and return 400 with a useful error message if not. Return 201 with the created habit on success. Write `getHabit`, `deleteHabit`, and `createCheckIn` yourself with the same care.

---

## Chapter 7: Backend part 3, streak logic

This is the heart of the app and the part testing will care about most.

Create `backend/internal/habit/streak.go`:

```go
package habit

import (
	"sort"
	"time"
)

type Schedule string

const (
	Daily  Schedule = "daily"
	Weekly Schedule = "weekly"
)

// CurrentStreak returns the number of consecutive periods ending at
// `today` for which `checkIns` contains an entry.
//
// For Daily, a period is a calendar day in UTC.
// For Weekly, a period is an ISO week (Mon-Sun) in UTC.
//
// checkIns may be in any order. today is treated as UTC.
func CurrentStreak(schedule Schedule, today time.Time, checkIns []time.Time) int {
	if len(checkIns) == 0 {
		return 0
	}
	today = today.UTC()

	switch schedule {
	case Daily:
		return dailyStreak(today, checkIns)
	case Weekly:
		return weeklyStreak(today, checkIns)
	default:
		return 0
	}
}

func dailyStreak(today time.Time, checkIns []time.Time) int {
	days := make(map[string]bool, len(checkIns))
	for _, c := range checkIns {
		days[c.UTC().Format("2006-01-02")] = true
	}

	streak := 0
	cursor := startOfDay(today)
	for {
		key := cursor.Format("2006-01-02")
		if !days[key] {
			break
		}
		streak++
		cursor = cursor.AddDate(0, 0, -1)
	}
	return streak
}

func weeklyStreak(today time.Time, checkIns []time.Time) int {
	weeks := make(map[string]bool, len(checkIns))
	for _, c := range checkIns {
		weeks[isoWeekKey(c.UTC())] = true
	}

	// Sort check-ins descending so we can find the most recent.
	sorted := append([]time.Time(nil), checkIns...)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].After(sorted[j]) })

	streak := 0
	cursor := today
	for {
		if !weeks[isoWeekKey(cursor)] {
			break
		}
		streak++
		cursor = cursor.AddDate(0, 0, -7)
	}
	return streak
}

func startOfDay(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
}

func isoWeekKey(t time.Time) string {
	y, w := t.ISOWeek()
	return formatWeek(y, w)
}

func formatWeek(year, week int) string {
	return time.Date(year, 1, 1, 0, 0, 0, 0, time.UTC).Format("2006") + "-W" + padWeek(week)
}

func padWeek(w int) string {
	if w < 10 {
		return "0" + itoa(w)
	}
	return itoa(w)
}

func itoa(n int) string {
	return time.Date(0, 0, n, 0, 0, 0, 0, time.UTC).Format("2")
}
```

You will notice some unusual choices. `itoa` is implemented in a slightly contrived way to avoid pulling in `strconv` just for this. In a real codebase, use `strconv.Itoa`. The point here is to show that the streak computation is pure: same inputs, same outputs, no clock reads inside, no database access. That property is what makes it testable.

**Principle.** Push side effects to the edges. Pure functions in the core; impure functions at the boundary. Tests get faster and more honest.

**Principle.** Take the current time as a parameter. Code that calls `time.Now()` internally cannot be tested at boundaries (year-end, leap years, DST transitions) without time-faking libraries.

### Wiring streaks into the API

Add a route `GET /api/habits/{id}/streak` that returns `{ "streak": N }`. The handler fetches the habit, fetches its check-ins, calls `habit.CurrentStreak`, and returns the result.

### Exercise

Add a "longest streak" function `LongestStreak(schedule, checkIns) int` that returns the length of the longest consecutive run anywhere in history, not just ending today. Write the signature first. Think about the algorithm before coding it.

---

## Chapter 8: Unit testing in Go

### The testing package

Go has built-in testing. No framework required. Files ending in `_test.go` in the same package are picked up by `go test`. Functions of the form `func TestXxx(t *testing.T)` are run.

Create `backend/internal/habit/streak_test.go`:

```go
package habit

import (
	"testing"
	"time"
)

func TestCurrentStreakDaily(t *testing.T) {
	today := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)

	tests := []struct {
		name    string
		checkIns []time.Time
		want    int
	}{
		{
			name: "three consecutive days ending today",
			checkIns: []time.Time{
				date(2026, 5, 19),
				date(2026, 5, 18),
				date(2026, 5, 17),
			},
			want: 3,
		},
		{
			name: "two days ending yesterday, today missing",
			checkIns: []time.Time{
				date(2026, 5, 18),
				date(2026, 5, 17),
			},
			want: 0,
		},
		{
			name: "gap breaks the streak",
			checkIns: []time.Time{
				date(2026, 5, 19),
				date(2026, 5, 17),
			},
			want: 1,
		},
		{
			name:     "empty list",
			checkIns: nil,
			want:     0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CurrentStreak(Daily, today, tt.checkIns)
			if got != tt.want {
				t.Fatalf("got %d, want %d", got, tt.want)
			}
		})
	}
}

func date(y int, m time.Month, d int) time.Time {
	return time.Date(y, m, d, 0, 0, 0, 0, time.UTC)
}
```

Run `go test ./internal/habit/`. You should see the subtests listed by name.

A few things to absorb. This is the **table-driven test** pattern, the dominant idiom in Go test code. Every case is data, the loop is uniform, the assertions are minimal. When a test fails, the name in the failure tells you exactly which row broke. Adding a case is one line.

**Principle.** Table-driven tests scale. The first time you write tests for a function, write them this way even if there are only two cases. Adding the eleventh case is then trivial.

### Subtests and parallelism

`t.Run(name, fn)` creates a subtest. Inside a subtest, calling `t.Parallel()` lets the runner schedule it concurrently with other parallel tests. For pure functions, parallel tests are free speed. For tests that touch shared state (databases, filesystems), be careful.

### testify, used sparingly

`testify` provides `assert` and `require` packages. The difference: `require` halts the test on failure, `assert` records the failure and continues. For most cases, prefer `require` so you do not chase cascading failures.

```bash
go get github.com/stretchr/testify/require
```

```go
require.Equal(t, tt.want, got)
```

The standard library is enough for many tests. Reach for `testify` only when your assertions get repetitive.

### What to test

- Pure business logic, exhaustively. Streak math here.
- Validation rules. Each branch.
- Error paths. If a function returns an error in three cases, test all three.

### What not to over-test

- Standard library and framework code. You do not need to verify that `http.HandleFunc` calls your handler.
- Trivial getters and setters.
- Code you do not own.

### Coverage

Run with coverage:

```bash
go test -cover ./...
go test -coverprofile=cover.out ./...
go tool cover -html=cover.out
```

The HTML report shows you exactly which lines ran. Coverage is a _signal_. High coverage with bad assertions proves nothing. Low coverage means you have not exercised parts of the code at all. Neither extreme is healthy.

**Principle.** Coverage tells you what was not tested. It does not tell you what was tested well. The next chapter is about a tool that tells you the second thing.

### Exercise

Write tests for the weekly streak. Include at least one case that spans a year boundary (week 1 vs week 52). Include one case at the ISO week boundary (Sunday vs Monday). Use the table pattern.

---

## Chapter 9: Mutation testing in Go with gremlins

### What mutation testing is

Imagine your test suite has 100 percent coverage. Every line runs. Now imagine an attacker silently changes `>` to `>=` in your streak logic. Do any of your tests fail?

Mutation testing answers that question, mechanically. The tool makes small changes to your source (changes a `+` to a `-`, an `&&` to a `||`, a `0` to a `1`), runs your tests, and reports whether each change was caught. Each change is called a **mutant**. Caught means at least one test failed. Survived means every test still passed despite the change.

If mutants survive in code you care about, your tests are not really testing what you think.

### gremlins

`gremlins` is an actively maintained mutation testing tool for Go. Install it:

```bash
go install github.com/go-gremlins/gremlins/cmd/gremlins@latest
```

Make sure your `GOPATH/bin` is on your `PATH`.

### Running it

From `backend/`:

```bash
gremlins unleash ./internal/habit/...
```

It will compile your code, mutate it line by line, and run your tests against each mutant. The output looks like:

```
RUNNABLE  internal/habit/streak.go:34:5  KILLED   `streak++` => `streak--`
RUNNABLE  internal/habit/streak.go:36:9  LIVED    `AddDate(0, 0, -1)` => `AddDate(0, 0, 0)`
```

`KILLED` is what you want. `LIVED` means the tests passed despite a clearly wrong change.

### Reading a survived mutant

Take the `AddDate(0, 0, -1)` => `AddDate(0, 0, 0)` mutant. The original walks the cursor back one day. The mutated version does not move the cursor. With this mutation, the loop becomes infinite or always finds today's check-in repeatedly.

If a mutant survives, there are three possibilities:

1. Your tests do not cover that case. Add a test.
2. The mutation produces equivalent behavior (rare, but real). Document why and move on.
3. The mutation reveals a real bug masked by weak assertions.

The first is the most common, by far.

### Strengthening tests until mutants die

Suppose the `streak++` mutation survived. That would mean no test asserts on the _count_ of the streak; only on whether it is zero or non-zero. Fix by adding a case that asserts the exact count for a long streak. The mutant changes 3 to a different number, and the test catches it.

### Mutation score

`gremlins` reports a kill ratio: percent of runnable mutants that died. There is no universal target. For critical business logic, aim above 80 percent. For glue code, less. Do not chase 100 percent across the whole codebase. The cost grows steeply at the end and the marginal mutants are usually equivalent.

**Principle.** Mutation testing is not a CI gate for the whole codebase. It is a diagnostic tool you point at the parts of the code where bugs would hurt most.

### Configuration

Create `backend/.gremlins.yaml` to scope and tune runs:

```yaml
silent: false
workers: 4
test-cpu: 1
mutants:
  conditionals_boundary:
    enabled: true
  arithmetic_base:
    enabled: true
  increment_decrement:
    enabled: true
  conditional_negation:
    enabled: true
```

The mutators correspond to categories of changes. Boundary mutations (`<` to `<=`) are particularly valuable for streak math.

### Exercise

Run `gremlins unleash ./internal/habit/...` and record the kill ratio. Pick one surviving mutant, write a new test that kills it, and re-run. Do this until the ratio is above 85 percent or every survivor is genuinely equivalent. Note in a comment which survivors are equivalent and why.

---

## Chapter 10: Generating the API contract with tygo

### Why generate types

Your Go server defines structs like `Habit`. Your TypeScript client wants to know that shape. Writing it twice means it will drift. Drift means silent runtime bugs.

We will generate TypeScript type definitions from Go structs using `tygo`.

```bash
go install github.com/gzuidhof/tygo@latest
```

### Configure tygo

Create `backend/tygo.yaml`:

```yaml
packages:
  - path: "github.com/yourname/habitforge/backend/internal/store"
    output_path: "../frontend/src/types/api.ts"
    type_mappings:
      time.Time: "string"
```

We map `time.Time` to `string` because that is what JSON looks like over the wire (ISO 8601). The frontend treats dates as strings unless and until it needs Date objects.

### Annotate exports

Open `backend/internal/store/store.go`. tygo picks up exported types automatically. If you want to add JSON tags, do so. We have already done that.

You may also want a request DTO. Add it:

```go
// CreateHabitRequest is the JSON body of POST /api/habits.
type CreateHabitRequest struct {
	Name     string `json:"name"`
	Schedule string `json:"schedule"`
}

// CheckInResponse is returned for streak queries.
type StreakResponse struct {
	Streak int `json:"streak"`
}
```

### Generate

```bash
cd backend
tygo generate
```

Open `frontend/src/types/api.ts`:

```ts
export interface Habit {
  id: number;
  name: string;
  schedule: string;
  createdAt: string;
}

export interface CreateHabitRequest {
  name: string;
  schedule: string;
}

export interface StreakResponse {
  streak: number;
}
```

Now the frontend imports `Habit` and friends and stays in sync with the backend by regenerating.

**Principle.** A single source of truth across language boundaries is the cheapest correctness measure you can buy. Generate, do not duplicate.

### Make it part of the workflow

Add a `Makefile` at the repo root:

```makefile
.PHONY: gen
gen:
	cd backend && sqlc generate && tygo generate
```

Run `make gen` whenever you change a struct.

### Exercise

Add a `name` length constraint in your Go validation (1 to 80 characters). Then add a corresponding rule in the frontend (Chapter 13 will cover Zod) and observe how easy it is for these to diverge if you are not careful. We will discuss strategies in the testing chapters.

---

## Chapter 11: Frontend part 1, pages and the App Router

### The shape of an App Router project

```
frontend/src/
  app/
    layout.tsx       # Root layout. Wraps every page.
    page.tsx         # The "/" route.
    habits/
      page.tsx       # The "/habits" route.
      [id]/
        page.tsx     # The "/habits/:id" route.
  components/
    habit-list.tsx
    habit-card.tsx
  lib/
    api.ts           # Fetch helpers.
  types/
    api.ts           # Generated by tygo.
```

A `page.tsx` exports a default React component. The filename and folder define the URL. Brackets in folder names mean dynamic segments.

### Root layout

`frontend/src/app/layout.tsx` is created by `create-next-app`. It defines `<html>` and `<body>` and wraps every page. You usually do not change it much except for adding providers (which we will, for TanStack Query).

### The first real page

Replace `frontend/src/app/page.tsx`:

```tsx
import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-3xl font-bold">HabitForge</h1>
      <p className="mt-2 text-gray-600">Track your daily and weekly habits.</p>
      <Link
        href="/habits"
        className="mt-4 inline-block rounded bg-black px-4 py-2 text-white"
      >
        View habits
      </Link>
    </main>
  );
}
```

This component runs on the server. There is no `useState`, no event handler, no `'use client'`. It produces HTML.

### A list page that fetches data

Create `frontend/src/lib/api.ts`:

```ts
import type { Habit, CreateHabitRequest } from "@/types/api";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export async function listHabits(): Promise<Habit[]> {
  const res = await fetch(`${BASE}/api/habits`, { cache: "no-store" });
  if (!res.ok) throw new Error(`listHabits: ${res.status}`);
  return res.json();
}

export async function createHabit(body: CreateHabitRequest): Promise<Habit> {
  const res = await fetch(`${BASE}/api/habits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`createHabit: ${res.status}`);
  return res.json();
}
```

A few principles. The base URL comes from an environment variable so it works locally and in production without code changes. `cache: 'no-store'` opts out of Next.js fetch caching for data that changes. Functions are tiny and named after the endpoint.

Now create `frontend/src/app/habits/page.tsx`:

```tsx
import { listHabits } from "@/lib/api";

export default async function HabitsPage() {
  const habits = await listHabits();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Your habits</h1>
      <ul className="mt-4 space-y-2">
        {habits.map((h) => (
          <li key={h.id} className="rounded border p-3">
            <span className="font-medium">{h.name}</span>
            <span className="ml-2 text-sm text-gray-500">{h.schedule}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

This is a server component that fetches in its own body. The data is fetched on the server, rendered to HTML, and shipped to the browser. No client-side loading spinner needed for the initial render.

### When to use a client component

You need `'use client'` whenever you need:

- React state (`useState`, `useReducer`)
- Effects (`useEffect`)
- Browser APIs (`window`, `localStorage`)
- Event handlers (`onClick`, `onChange`)
- Most third-party React libraries that use the above

Anything else should stay a server component. Mutations, forms, and our TanStack Query hooks will go in client components.

**Principle.** Render server-side until you need interactivity, then peel off the smallest possible client component. Avoid wrapping a whole page in `'use client'`.

### Enabling CORS on the backend

The frontend runs at :3000, the backend at :8080. Browsers block cross-origin requests unless the server explicitly allows them. Add to your Go router:

```go
import "github.com/go-chi/cors"

r.Use(cors.Handler(cors.Options{
    AllowedOrigins:   []string{"http://localhost:3000"},
    AllowedMethods:   []string{"GET", "POST", "DELETE", "OPTIONS"},
    AllowedHeaders:   []string{"Content-Type"},
    AllowCredentials: false,
    MaxAge:           300,
}))
```

After `go get github.com/go-chi/cors`.

### Exercise

Add a page at `/habits/[id]` that shows a single habit's details and current streak. Fetch from `/api/habits/:id` and `/api/habits/:id/streak`. Render a placeholder if either fails.

---

## Chapter 12: Frontend part 2, data fetching with TanStack Query

### Why a query library

The server component pattern is great for the initial render. As soon as the user does anything (creating a habit, marking a check-in) you want optimistic updates, automatic refetching, and a cache. Doing this by hand with `useState` and `useEffect` is a tar pit. TanStack Query exists because that tar pit has eaten too many afternoons.

```bash
cd frontend
bun add @tanstack/react-query
```

### Setting up the provider

Create `frontend/src/app/providers.tsx`:

```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

Wrap your app in `frontend/src/app/layout.tsx`:

```tsx
import { Providers } from "./providers";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

Notice the providers file is a client component but the layout itself is not. This is the smallest-possible-client-component principle in action.

### Queries

Create `frontend/src/components/habit-list.tsx`:

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { listHabits } from "@/lib/api";

export function HabitList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["habits"],
    queryFn: listHabits,
  });

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p className="text-red-600">Failed to load</p>;
  if (!data || data.length === 0) return <p>No habits yet.</p>;

  return (
    <ul className="space-y-2">
      {data.map((h) => (
        <li key={h.id} className="rounded border p-3">
          {h.name} <span className="text-gray-500 text-sm">{h.schedule}</span>
        </li>
      ))}
    </ul>
  );
}
```

The `queryKey` is the cache key. Any component using the same key shares the same data and the same loading state.

### Mutations

```tsx
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createHabit } from "@/lib/api";

export function NewHabitForm() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [schedule, setSchedule] = useState<"daily" | "weekly">("daily");

  const mutation = useMutation({
    mutationFn: createHabit,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      setName("");
    },
  });

  return (
    <div className="space-y-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Habit name"
        className="border rounded px-2 py-1 w-full"
      />
      <select
        value={schedule}
        onChange={(e) => setSchedule(e.target.value as "daily" | "weekly")}
        className="border rounded px-2 py-1"
      >
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
      </select>
      <button
        onClick={() => mutation.mutate({ name, schedule })}
        disabled={mutation.isPending || !name}
        className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {mutation.isPending ? "Creating..." : "Create"}
      </button>
      {mutation.error && (
        <p className="text-red-600 text-sm">Could not create habit</p>
      )}
    </div>
  );
}
```

`invalidateQueries({ queryKey: ['habits'] })` tells TanStack Query that the `habits` cache is stale, which triggers a refetch in any component using it.

**Principle.** Invalidation is the simplest cache strategy and works for most cases. Reach for optimistic updates only after invalidation feels slow.

### Optimistic updates (for check-ins)

For a check-in, the user expects instant feedback. The mutation can update the cache before the server responds and roll back on error.

```tsx
const checkIn = useMutation({
  mutationFn: (habitId: number) => createCheckIn(habitId),
  onMutate: async (habitId) => {
    await qc.cancelQueries({ queryKey: ["streak", habitId] });
    const prev = qc.getQueryData<{ streak: number }>(["streak", habitId]);
    qc.setQueryData(["streak", habitId], { streak: (prev?.streak ?? 0) + 1 });
    return { prev };
  },
  onError: (_err, habitId, ctx) => {
    if (ctx?.prev) qc.setQueryData(["streak", habitId], ctx.prev);
  },
  onSettled: (_data, _err, habitId) => {
    qc.invalidateQueries({ queryKey: ["streak", habitId] });
  },
});
```

There is a subtle bug to think about: incrementing by one assumes today was not already checked in. The server is the source of truth, so on settled we invalidate and the real number replaces ours. Optimistic updates are a UX nicety, not a correctness mechanism.

### Exercise

Wire up the check-in mutation on the habit detail page. Make the button optimistic. Try it with the backend running and then with the backend stopped to confirm the rollback works.

---

## Chapter 13: Frontend part 3, forms and validation

### react-hook-form and Zod

For anything beyond two inputs, manual `useState` becomes painful. `react-hook-form` handles the state, validation, and submission of forms with very little re-rendering. `zod` validates and parses unknown data into typed objects.

```bash
bun add react-hook-form zod @hookform/resolvers
```

### Defining the schema

Create `frontend/src/lib/schemas.ts`:

```ts
import { z } from "zod";

export const habitSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(80, "Name must be 80 characters or fewer"),
  schedule: z.enum(["daily", "weekly"]),
});

export type HabitInput = z.infer<typeof habitSchema>;
```

`z.infer` gives you the TypeScript type automatically from the schema. The schema is the source of truth at the boundary; you do not maintain a separate interface.

### The form component

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createHabit } from "@/lib/api";
import { habitSchema, type HabitInput } from "@/lib/schemas";

export function NewHabitForm() {
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<HabitInput>({
    resolver: zodResolver(habitSchema),
    defaultValues: { name: "", schedule: "daily" },
  });

  const mutation = useMutation({
    mutationFn: createHabit,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      reset();
    },
  });

  return (
    <form
      onSubmit={handleSubmit((data) => mutation.mutate(data))}
      className="space-y-2"
    >
      <div>
        <input
          {...register("name")}
          placeholder="Habit name"
          className="border rounded px-2 py-1 w-full"
        />
        {errors.name && (
          <p className="text-red-600 text-sm">{errors.name.message}</p>
        )}
      </div>
      <select {...register("schedule")} className="border rounded px-2 py-1">
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
      </select>
      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
      >
        Create
      </button>
    </form>
  );
}
```

Notice the lack of manual `value` and `onChange`. `register` does both. The form's submission is type-safe: `data` is `HabitInput` and you cannot pass anything else to `mutation.mutate` without a compile error.

### Validation duplication

You now have validation rules in two places: Zod on the frontend, manual checks in Go on the backend. They are not derived from each other. This is a real source of bugs in practice and you have two main options:

1. Accept the duplication and write a test that exercises both with the same cases.
2. Generate one from the other (more advanced).

For this project, option 1 is honest and sufficient. We will cover the cross-checking test in Chapter 14.

**Principle.** Two sources of truth at a boundary is a maintenance contract. Be explicit about which is canonical, and verify they agree with a test.

### Exercise

Add an `archived` flag to habits. Update the Go struct, run `make gen` (the Makefile from Chapter 10) to regenerate the types, and add a filter to the list page to hide archived habits. Notice how the type flow forces you through every place that needs to change.

---

## Chapter 14: Unit testing in TypeScript with Vitest

### Why Vitest

Jest is the historical default in React projects. Vitest is faster, ESM-native, and shares its config with Vite. Next.js 15 plays well with both. We will use Vitest.

```bash
bun add -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react
```

Create `frontend/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

Create `frontend/vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

Add a script to `package.json`:

```json
"scripts": {
  "test": "vitest"
}
```

### Testing pure logic

Start with the Zod schema. Pure logic is the easiest to test and where mutation testing will pay off later.

Create `frontend/src/lib/schemas.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { habitSchema } from "./schemas";

describe("habitSchema", () => {
  it("accepts a valid input", () => {
    const result = habitSchema.safeParse({ name: "Read", schedule: "daily" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = habitSchema.safeParse({ name: "", schedule: "daily" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Name is required");
    }
  });

  it("rejects a name over 80 characters", () => {
    const result = habitSchema.safeParse({
      name: "a".repeat(81),
      schedule: "daily",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown schedule", () => {
    const result = habitSchema.safeParse({ name: "Read", schedule: "hourly" });
    expect(result.success).toBe(false);
  });
});
```

Run `bun run test`. You should see all four pass.

**Principle.** When you mean "run a script from `package.json`", say `bun run <name>`, not `bun <name>`. The shortcut works for most names (`bun dev` runs the `dev` script) but `bun test` is a special case: it invokes Bun's built-in test runner, not your `test` script. Vitest never gets called, your tests do not run, and Bun reports zero failures because there is nothing to fail. This is the most common Bun footgun. Use `bun run test` and the ambiguity disappears.

### Testing components

Create `frontend/src/components/habit-list.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HabitList } from "./habit-list";
import * as api from "@/lib/api";

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe("HabitList", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders an empty state", async () => {
    vi.spyOn(api, "listHabits").mockResolvedValue([]);
    renderWithClient(<HabitList />);
    expect(await screen.findByText(/no habits yet/i)).toBeInTheDocument();
  });

  it("renders fetched habits", async () => {
    vi.spyOn(api, "listHabits").mockResolvedValue([
      {
        id: 1,
        name: "Read",
        schedule: "daily",
        createdAt: "2026-05-19T00:00:00Z",
      },
    ]);
    renderWithClient(<HabitList />);
    expect(await screen.findByText("Read")).toBeInTheDocument();
  });
});
```

Three principles in this file. First, queries should be by accessible role or text, not by class name or test ID. `screen.findByText` simulates how a user would locate the element. Second, we mock the network function, not `fetch` directly, because we control that surface. Third, each test gets its own `QueryClient` to avoid cache leaking between tests.

**Principle.** Test through the public API of a component (the rendered output) and the public API of its dependencies (the imported functions). Reach for implementation details only when there is no alternative.

### Cross-checking validation

Earlier we accepted the duplication of validation between Go and TypeScript. Write a test that pins the contract. In `frontend/src/lib/schemas.test.ts`:

```ts
it("schema constants match the backend (pinned)", () => {
  // These values are also enforced in backend/internal/httpapi/validation.go.
  // If you change one, change both, and update this test.
  expect(habitSchema.shape.name.maxLength).toBe(80);
});
```

This test does not prove the backend agrees, but it makes drift visible: any developer reading it sees the cross-package contract.

### Exercise

Write tests for `NewHabitForm`. Assert that submitting an empty name shows the error message and does not call the mutation. Assert that submitting a valid name calls the mutation with the right arguments.

---

## Chapter 15: Mutation testing in TypeScript with Stryker

### Setup

```bash
bun add -D @stryker-mutator/core @stryker-mutator/vitest-runner
```

Create `frontend/stryker.config.mjs`:

```js
export default {
  testRunner: "vitest",
  reporters: ["progress", "clear-text", "html"],
  mutate: ["src/lib/**/*.ts", "!src/lib/**/*.test.ts"],
  coverageAnalysis: "perTest",
  thresholds: { high: 80, low: 60, break: null },
};
```

Add a script:

```json
"scripts": {
  "test": "vitest",
  "mutate": "stryker run"
}
```

### Running it

```bash
bun run mutate
```

Stryker prints a summary and writes an HTML report to `reports/mutation/mutation.html`. Open it in a browser.

The report shows every line of `src/lib/` with mutants annotated. Click a survived mutant to see what change was made and which tests ran against it.

### What Stryker mutates

By default: boolean operators (`&&` to `||`), comparison operators (`<` to `<=`), arithmetic, string literals, conditional expressions, and more. The same families you saw in `gremlins`.

### Killing mutants in the schema

Suppose Stryker mutates `.min(1, ...)` to `.min(0, ...)` and the mutant survives. That means no test asserts that an empty name fails. Look at your tests. The test exists in `schemas.test.ts` already. Why did the mutant survive?

A common cause is that the test checked `success === false` but did not assert on which validation failed. With the mutation, the empty string passes the `min(0)` check but might still fail somewhere else, and the test passes. Tighten the assertion:

```ts
it("rejects an empty name with the right message", () => {
  const result = habitSchema.safeParse({ name: "", schedule: "daily" });
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues).toContainEqual(
      expect.objectContaining({ message: "Name is required" }),
    );
  }
});
```

Now the mutant dies because the specific message is no longer produced.

### Comparing the two ecosystems

`gremlins` and Stryker do essentially the same thing in different languages. The principles transfer. In both cases:

- Run on small, important code first
- Read each survivor with the same seriousness you would a code review comment
- Resist the urge to chase 100 percent

**Principle.** Mutation testing is a diagnostic, not a metric to optimise. Use it to find weak tests, fix them, and move on. The kill ratio is a snapshot, not a leaderboard.

### Exercise

Run `bun run mutate` and pick three survivors. For each, decide: is it a weak test, an equivalent mutant, or a real bug? Strengthen the tests for the first category, document the second, and (delight) file a bug if you find the third.

---

## Chapter 16: Wiring it all together and where to go next

### Running everything

In two terminals:

```bash
# terminal 1
cd backend
go run ./cmd/server

# terminal 2
cd frontend
bun dev
```

Open http://localhost:3000. Create a habit. Mark a check-in. Watch the streak update.

### Adding Docker Compose (optional)

Once you outgrow two terminals, write a `docker-compose.yml`:

```yaml
services:
  backend:
    build: ./backend
    ports: ["8080:8080"]
    volumes:
      - ./backend/habitforge.db:/app/habitforge.db
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8080
    depends_on: [backend]
```

This is left as a longer exercise because container best practices for both Go and Next.js deserve their own guide.

### Common gotchas

- **CORS** errors in the browser console. The fix is in Chapter 11. Make sure the allowed origin matches exactly, port included.
- **Port already in use** when restarting the Go server. Use `lsof -i :8080` to find the orphaned process.
- **Stale generated types**. If you change a Go struct and the frontend does not see it, run `make gen`.
- **Time zones**. If your machine is not in UTC, manual testing of streaks will produce confusing results at midnight. The code is UTC-only on purpose; reflect on what this means for real users.

### Where to go next

Concrete exercises in increasing difficulty:

1. Add a "longest streak" display to the detail page. (Backend + frontend.)
2. Add habit archiving and a toggle to show archived habits.
3. Replace SQLite with PostgreSQL. (sqlc supports both; the queries are nearly identical.)
4. Add server-sent events or WebSockets so check-ins push to other open tabs.
5. Add a real authentication layer. (Cookies, sessions, password hashing with `argon2id`.)
6. Containerise both services and stand them up on a small VPS.
7. Add structured logging with `log/slog` on the backend and a request-ID middleware that propagates through every log line.
8. Add OpenTelemetry tracing across the boundary and view spans in Jaeger.

### Reading material

For Go: _The Go Programming Language_ by Donovan and Kernighan is still the best book. The standard library documentation at pkg.go.dev is unusually well-written. The Go blog has essays on specific topics worth reading in full (the error handling and context articles especially).

For TypeScript and React: the official React docs at react.dev are the modern source of truth and well-paced. _Effective TypeScript_ by Dan Vanderkam is the closest equivalent to the Go book above. The TanStack Query docs are worth a full read.

For testing philosophy: _Working Effectively with Unit Tests_ by Jay Fields and Kent Beck's _Test-Driven Development by Example_ are short and still relevant. The Google Testing Blog archive is gold.

For mutation testing specifically: the original paper by DeMillo, Lipton, and Sayward (1978) is short and readable. The `gremlins` and Stryker docs both link to it.

---

## Chapter 17: Deciding to decompose into services

The first thing this chapter has to say is that the monolith you just built is the right architecture for HabitForge as it stands. Splitting it is overkill for the problem. The reason this chapter exists is to teach the pattern, with an honest accounting of what it buys and what it costs. If you internalise nothing else from these last three chapters, internalise that microservices are a tool with a steep operational tax. Pay the tax when you need the capability, not because the architecture is fashionable.

### Real reasons to split

There are five common ones, in roughly decreasing legitimacy:

1. **Different scaling profiles.** One subsystem is read-heavy, another write-heavy. One is CPU-bound, another IO-bound. Co-locating them wastes capacity at runtime.
2. **Different reliability budgets.** Auth needs to be 99.99 percent. Recommendations can be 99 percent. Mixing them forces the recommendation code to inherit auth's operational discipline.
3. **Different release cadences.** A checkout service ships daily, a billing service ships quarterly. The slow code blocks the fast code in a monolith.
4. **Different languages or runtimes.** A model server needs Python. A high-throughput edge handler needs Rust. Splitting is the honest way to do polyglot.
5. **Different teams.** Two teams stepping on each other in the same codebase eventually decompose, whether you plan it or not (Conway's law in action).

If none of those apply, you should not split. Skipping this paragraph has done immense damage to the industry.

### What it costs

Each service added multiplies operational concerns. N services means N deploy pipelines, N alerting setups, N runbooks. Every cross-service call is a potential failure mode: timeouts, retries, idempotency, partial failures, ordering. Debugging means correlating logs across processes. Refactoring across service boundaries is harder than refactoring inside one, because it now requires a coordinated deploy or a backward-compatible contract change.

**Principle.** Microservices buy independence at the cost of cohesion. Make the trade consciously.

**Principle.** The right time to extract a service is when keeping the code in the monolith causes more pain than the network call will. Wait for the pain.

### The pedagogical split for HabitForge

We will split HabitForge into three services:

```
                      +-----------------+
                      |    Frontend     |
                      |   (Next.js)     |
                      +--------+--------+
                               |
                               v
                      +-----------------+
                      |    Gateway      |
                      |     :8080       |
                      +--------+--------+
                          |          |
                +---------+          +---------+
                v                              v
       +----------------+              +------------------+
       | habits-service |              | analytics-service|
       |     :8081      |<-------------|     :8082        |
       |   (SQLite)     |   internal   |   (stateless)    |
       +----------------+   HTTP call  +------------------+
```

Three pieces:

- **habits-service** owns habits and check-ins. The existing backend, renamed.
- **analytics-service** owns streak computation. Stateless. Pulls check-ins from habits-service over an internal HTTP endpoint.
- **gateway** is the only service the frontend talks to. It routes requests to the right backend.

The reasoning being taught:

- Analytics is read-heavy and side-effect-free. In a real system it would benefit from caching and could scale independently.
- The gateway centralises CORS, request IDs, and (later) authentication.
- Each backend service owns one bounded context.

Repository layout after the split:

```
habitforge/
  habits-service/      (was backend/)
  analytics-service/
  gateway/
  frontend/
  docker-compose.yml
  Makefile
```

**Principle.** Decompose along bounded contexts, not along technical layers. "user-service plus database-service plus cache-service" is a distributed monolith dressed up as microservices.

### Exercise

Before writing any code, write down two answers in your own words:

1. What is the one thing each of the three services is responsible for? One sentence per service.
2. If you were running HabitForge in production today with 100 users, would you actually split it? Justify with a real metric, not a feeling.

---

## Chapter 18: Extracting the analytics service

### Step 1: Rename and restructure

From the repository root:

```bash
mv backend habits-service
```

Open `habits-service/go.mod` and rename the module path:

```
module github.com/yourname/habitforge/habits-service
```

Update every Go import that referenced the old path. `gopls` flags the broken imports in your editor; fix them.

### Step 2: Create the analytics service skeleton

```bash
mkdir -p analytics-service/cmd/server \
         analytics-service/internal/streak \
         analytics-service/internal/habitsclient \
         analytics-service/internal/httpapi
cd analytics-service
go mod init github.com/yourname/habitforge/analytics-service
go get github.com/go-chi/chi/v5
```

### Step 3: Move the streak logic

Copy `habits-service/internal/habit/streak.go` and `streak_test.go` into `analytics-service/internal/streak/`. Change the package declaration to `package streak`. The pure functions move untouched, which is exactly why we built them that way in Chapter 7.

Delete the streak file and the streak route from habits-service. That responsibility now lives elsewhere.

**Principle.** Pure functions move freely across service boundaries. Functions tangled with database calls and HTTP responses do not. Build for movability before you need it.

### Step 4: Expose check-ins from habits-service

The analytics service needs check-ins. Add an internal endpoint to habits-service:

```go
// habits-service/internal/httpapi/router.go, inside NewRouter()
r.Route("/internal/habits", func(r chi.Router) {
    r.Get("/{id}/checkins", api.listCheckInsInternal)
})
```

```go
func (a *API) listCheckInsInternal(w http.ResponseWriter, r *http.Request) {
    id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
    if err != nil {
        writeError(w, http.StatusBadRequest, "invalid id")
        return
    }
    days, err := a.Store.ListCheckIns(r.Context(), id)
    if err != nil {
        writeError(w, http.StatusInternalServerError, "could not load checkins")
        return
    }
    out := make([]string, 0, len(days))
    for _, d := range days {
        out = append(out, d.Format("2006-01-02"))
    }
    writeJSON(w, http.StatusOK, map[string]any{"checkins": out})
}
```

The `/internal/` prefix is a convention we adopt: the gateway does not route anything under `/internal/` to clients. It signals that this endpoint exists for other services, not for the public.

**Principle.** Internal APIs and public APIs are different products with different stability guarantees. Mark them clearly in the URL or in the network topology.

### Step 5: Build the habits client

In `analytics-service/internal/habitsclient/client.go`:

```go
package habitsclient

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type Client struct {
	baseURL string
	http    *http.Client
}

func New(baseURL string) *Client {
	return &Client{
		baseURL: baseURL,
		http:    &http.Client{Timeout: 5 * time.Second},
	}
}

type checkinsResponse struct {
	Checkins []string `json:"checkins"`
}

func (c *Client) ListCheckIns(ctx context.Context, habitID int64) ([]time.Time, error) {
	url := fmt.Sprintf("%s/internal/habits/%d/checkins", c.baseURL, habitID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}
	if reqID := ctx.Value(reqIDKey{}); reqID != nil {
		req.Header.Set("X-Request-ID", fmt.Sprint(reqID))
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("call habits-service: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("habits-service returned %d", resp.StatusCode)
	}
	var body checkinsResponse
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	out := make([]time.Time, 0, len(body.Checkins))
	for _, s := range body.Checkins {
		t, err := time.Parse("2006-01-02", s)
		if err != nil {
			return nil, fmt.Errorf("parse date %q: %w", s, err)
		}
		out = append(out, t)
	}
	return out, nil
}

type reqIDKey struct{}
```

Three things to internalise. First, every cross-service HTTP call gets a timeout. No exceptions. A request without a timeout is a request that can hang forever and tie up a worker. Second, the context is propagated, including the request ID. Third, the response type is defined locally. We are not importing it from habits-service, even though that would be slightly less typing.

**Principle.** Two services must be able to deploy independently. If they share a Go package for request or response shapes, they cannot. The duplication is the price of independence.

### Step 6: Wire up the analytics handlers

```go
// analytics-service/internal/httpapi/router.go
package httpapi

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/yourname/habitforge/analytics-service/internal/habitsclient"
	"github.com/yourname/habitforge/analytics-service/internal/streak"
)

type API struct {
	Habits *habitsclient.Client
}

func NewRouter(api *API) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(10 * time.Second))

	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(200) })
	r.Get("/streak/{habitID}", api.getStreak)
	return r
}

func (a *API) getStreak(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "habitID"), 10, 64)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	checkIns, err := a.Habits.ListCheckIns(r.Context(), id)
	if err != nil {
		// Distinguish "we did our job, upstream failed" from "we are broken".
		http.Error(w, "upstream error", http.StatusBadGateway)
		return
	}
	n := streak.CurrentStreak(streak.Daily, time.Now().UTC(), checkIns)
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]int{"streak": n})
}
```

The `502 Bad Gateway` response is intentional. The analytics service did its job; the failure was upstream. Distinguishing these statuses makes operational debugging tractable: a spike of 5xx that is mostly 502 points your investigation at habits-service, not at analytics-service.

### Step 7: The main

```go
// analytics-service/cmd/server/main.go
package main

import (
	"log"
	"net/http"
	"os"

	"github.com/yourname/habitforge/analytics-service/internal/habitsclient"
	"github.com/yourname/habitforge/analytics-service/internal/httpapi"
)

func main() {
	addr := envOr("ADDR", ":8082")
	habitsURL := envOr("HABITS_URL", "http://localhost:8081")

	client := habitsclient.New(habitsURL)
	r := httpapi.NewRouter(&httpapi.API{Habits: client})

	log.Printf("analytics listening on %s, habits at %s", addr, habitsURL)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("server: %v", err)
	}
}

func envOr(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}
```

Every service reads its dependencies from the environment. Hard-coded URLs are how you ship "works on my machine".

### Aside: HTTP versus events

The architecture above is synchronous: analytics asks habits over HTTP whenever a streak is requested. In production you would more likely have habits-service publish a `CheckInCreated` event to a message broker (NATS, Kafka, Redis Streams), and analytics-service would consume the stream and maintain its own read model.

The trade-off:

- **Sync HTTP** is simpler, strongly consistent, and requires habits-service to be up whenever a streak is requested.
- **Async events** add moving parts and eventual consistency, but services survive each other's outages and analytics can keep its own cache that scales independently.

For a learning project, sync is honest. For a real product with multiple readers of habit data, events are usually right. Both are worth understanding.

### Exercise

Add a `GET /longest-streak/{habitID}` endpoint to analytics-service. Reuse the `LongestStreak` function from Chapter 7's exercise. Notice how the absence of a database in this service made the move trivial.

---

## Chapter 19: The gateway, observability, and running it all

### Why a gateway

Without a gateway, the frontend would need to know two backend URLs (more, as the system grows), handle CORS for each, and reimplement cross-cutting concerns like auth on every call site. A gateway concentrates that work in one place.

It is also where you do request shaping: trimming payloads for mobile, aggregating data from multiple services into one response, attaching the requesting user's context. For HabitForge it does the simpler job of routing.

### Step 1: Create the gateway

```bash
mkdir -p gateway/cmd/server gateway/internal/httpapi
cd gateway
go mod init github.com/yourname/habitforge/gateway
go get github.com/go-chi/chi/v5 github.com/go-chi/cors
```

### Step 2: Reverse proxy routes

The simplest gateway implementation uses `httputil.ReverseProxy`, which copies requests to a backend and pipes the response back.

```go
// gateway/internal/httpapi/router.go
package httpapi

import (
	"net/http"
	"net/http/httputil"
	"net/url"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

type Config struct {
	HabitsURL    string
	AnalyticsURL string
}

func NewRouter(cfg Config) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(propagateRequestID)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(15 * time.Second))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"http://localhost:3000"},
		AllowedMethods: []string{"GET", "POST", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Content-Type", "X-Request-ID"},
		MaxAge:         300,
	}))

	habitsProxy := mustProxy(cfg.HabitsURL)
	analyticsProxy := mustProxy(cfg.AnalyticsURL)

	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(200) })

	// Specific route first, generic mount last.
	r.Get("/api/habits/{id}/streak", forwardStreak(analyticsProxy))
	r.Mount("/api/habits", http.StripPrefix("", habitsProxy))

	// Block accidental exposure of internal endpoints.
	r.HandleFunc("/internal/*", func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "not found", http.StatusNotFound)
	})

	return r
}

func mustProxy(target string) *httputil.ReverseProxy {
	u, err := url.Parse(target)
	if err != nil {
		panic(err)
	}
	return httputil.NewSingleHostReverseProxy(u)
}

func forwardStreak(p *httputil.ReverseProxy) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		r.URL.Path = "/streak/" + id
		r.URL.RawPath = ""
		p.ServeHTTP(w, r)
	}
}
```

The route order matters. We register `/api/habits/{id}/streak` before mounting `/api/habits`, otherwise the mount catches it first and forwards to habits-service, which would return 404.

**Principle.** A gateway is the public face of your system. Anything you do not explicitly route should be denied. Allow-list, do not deny-list.

### Step 3: Request IDs across services

`middleware.RequestID` generates a unique ID per request and stores it on the request context. We want that ID to flow downstream so logs across services can be correlated.

```go
func propagateRequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if reqID := middleware.GetReqID(r.Context()); reqID != "" {
			r.Header.Set("X-Request-ID", reqID)
		}
		next.ServeHTTP(w, r)
	})
}
```

In the backend services, configure chi to respect an incoming `X-Request-ID` rather than always generating a new one. Replace `middleware.RequestID` with a small custom middleware that reads the header if present, otherwise generates one.

**Principle.** A request ID is the cheapest observability investment you can make. Generate it once at the edge, propagate it everywhere, log it in every line. When something breaks you can trace the request through every hop with one grep.

### Step 4: Structured logging with log/slog

Each service should log JSON with consistent fields. The Go standard library has `log/slog` since 1.21.

```go
// in main.go of each service
import (
    "log/slog"
    "os"
)

func main() {
    logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
    slog.SetDefault(logger.With("service", "analytics"))
    // ...
}
```

In a handler:

```go
slog.InfoContext(r.Context(), "computing streak",
    "habit_id", habitID,
    "request_id", middleware.GetReqID(r.Context()),
)
```

The result is one JSON object per log line with `service`, `habit_id`, `request_id`, `level`, `time`, and `msg`. Any log aggregator (Loki, Elastic, Datadog) will index those fields and let you filter across services with one query.

### Step 5: Distributed tracing (pointer, not implementation)

When the system grows past three services, logs stop being enough. You need to see the shape of a request across services as a tree of spans with timings. The standard is OpenTelemetry: instrument each service with the OTel Go SDK, export spans to a collector, view them in Jaeger or Tempo.

We are not implementing this here because doing it justice would double the chapter length. Read the OpenTelemetry Go documentation and the chi instrumentation example. The same request-ID idea generalises into spans with parent-child relationships.

### Step 6: Docker Compose

Create `docker-compose.yml` at the repo root:

```yaml
services:
  habits-service:
    build: ./habits-service
    environment:
      ADDR: ":8081"
    volumes:
      - habits-data:/data
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8081/healthz"]
      interval: 5s
      timeout: 2s
      retries: 5

  analytics-service:
    build: ./analytics-service
    environment:
      ADDR: ":8082"
      HABITS_URL: "http://habits-service:8081"
    depends_on:
      habits-service:
        condition: service_healthy

  gateway:
    build: ./gateway
    ports: ["8080:8080"]
    environment:
      ADDR: ":8080"
      HABITS_URL: "http://habits-service:8081"
      ANALYTICS_URL: "http://analytics-service:8082"
    depends_on:
      - habits-service
      - analytics-service

  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    environment:
      NEXT_PUBLIC_API_URL: "http://localhost:8080"
    depends_on:
      - gateway

volumes:
  habits-data:
```

A reference Dockerfile for habits-service (the others follow the same pattern):

```dockerfile
# habits-service/Dockerfile
FROM golang:1.23 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /out/server ./cmd/server

FROM gcr.io/distroless/static-debian12
COPY --from=build /out/server /server
COPY --from=build /src/migrations /migrations
WORKDIR /
ENTRYPOINT ["/server"]
```

`CGO_ENABLED=0` produces a static binary that runs on `distroless/static`. The final image is small and contains no shell, which limits the blast radius if a vulnerability ever lets someone exec inside it.

Run `docker compose up --build`. Open http://localhost:3000. The frontend talks to the gateway, the gateway fans out, and you no longer have to remember which port runs which service.

### Step 7: Resilience patterns to know

You will not need all of these for HabitForge, but you should recognise them when you read about them.

- **Timeouts** on every outbound HTTP client. We have these.
- **Retries** with exponential backoff, only for idempotent requests. `GET`, `PUT`, `DELETE` are safe by design. `POST` is not, unless the request carries an idempotency key.
- **Circuit breakers** to fail fast when a downstream is unhealthy. `sony/gobreaker` is a good library when you need one.
- **Bulkheads** that cap concurrent calls to one service with a bounded semaphore, so it cannot saturate workers.
- **Hedged requests** that fire a second request after a P99 latency threshold and take the first response. Useful for read-heavy systems with tail-latency problems.

**Principle.** The network is unreliable. Code that ignores this is not microservices code, it is monolith code that happens to be split across processes.

### Step 8: Testing across services

Unit tests stay the same in each service. Two new categories appear.

**Integration tests.** Stand up the real dependencies (habits-service plus a database) in test containers, point analytics-service at them, run black-box tests against the analytics HTTP API. `testcontainers-go` makes this manageable from a Go test file.

**Contract tests.** Pact is the canonical tool. Each consumer (analytics-service) records the requests it makes against a provider (habits-service). The provider then verifies it still satisfies those contracts on every build. This catches breaking changes before they ship. Worth its own learning project.

### Step 9: What you lost

Be honest about the regressions from splitting:

- A single transaction across habits and check-ins is still possible (they share a service). A single transaction across habits and analytics is not. Streaks are computed; they are eventually correct, not atomically correct.
- Changing the contract between habits and analytics now requires a coordinated change across two services. The "rename a struct field" refactor is no longer free.
- Debugging a slow request means looking at three log streams, not one. The request ID is what makes this tractable.
- Local dev now wants `docker compose up` rather than two `go run` commands.

For HabitForge specifically, this is a poor trade. For a real product with the reasons listed in Chapter 17, it is worth it. Knowing the difference is the skill the last three chapters were trying to teach.

**Principle.** Distributed systems are a tax you pay for capabilities you need. Pay it deliberately, not aspirationally.

### Where to go next from the microservices version

Real follow-on exercises if you want to keep learning the pattern honestly:

1. Replace the synchronous habits-to-analytics HTTP call with NATS events. Have analytics maintain its own check-in cache and survive habits-service being down.
2. Add OpenTelemetry tracing across all three services. View spans in Jaeger.
3. Deploy to Kubernetes with three Deployments, three Services, and an Ingress. Use Helm or Kustomize.
4. Add a service mesh (Linkerd is the gentlest entry point). Observe how mTLS, retries, and metrics arrive without code changes.
5. Add a Pact contract test suite. Break the contract on purpose and watch the build catch the regression.

---

## Closing principles

Three habits that pay off forever, monolith or microservices:

**Read errors carefully.** Both Go and TypeScript compilers tell you exactly what is wrong. The temptation when starting a new language is to skim the error and try random fixes. Resist it. Errors are a fast feedback loop you do not have in many other parts of software, and in distributed systems they are the only feedback loop you have.

**Run your tests on every save.** Both `go test` and `vitest` are fast enough to run continuously while you work. Watch mode in Vitest is one keypress. A long-running test suite is a tooling problem, not a justification for skipping tests.

**Write the boring code.** When you find yourself reaching for a clever abstraction in your second week of a language, stop. Go and TypeScript both reward direct, plain code. The same applies to architecture: when you find yourself reaching for a clever distribution pattern in your second week of microservices, stop. Cleverness compounds, but so does its cost.

You now have enough to build the next thing yourself. Pick a problem, model the domain, write the streak-equivalent piece of pure logic, test it until mutants die, and put a small UI in front. If the thing grows, decompose for a reason, not for a vibe. The fifth time you do this loop, you will notice the parts that felt like ceremony have become muscle memory. That is the whole job.
