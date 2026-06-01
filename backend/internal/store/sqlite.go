package store

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"time"

	gen "github.com/sylvester/habitforge/backend/internal/store/gen"
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
		return nil, fmt.Errorf("list habits : %w", err)
	}
	out := make([]Habit, 0, len(rows))
	for _, r := range rows {
		t, _ := time.Parse(time.RFC3339, r.CreatedAt)
		out = append(out, Habit{ID: r.ID, Name: r.Name, Schedule: r.Schedule, CreatedAt: t})
	}
	return out, nil
}

func (s *SQLiteStore) GetHabit(ctx context.Context, id int64) (Habit, error) {
	row, err := s.q.GetHabit(ctx, id)
	if err != nil {
		return Habit{}, fmt.Errorf("get habit %d: %w", id, err)
	}
	t, _ := time.Parse(time.RFC3339, row.CreatedAt)
	return Habit{ID: row.ID, Name: row.Name, Schedule: row.Schedule, CreatedAt: t}, nil
}

func (s *SQLiteStore) DeleteHabit(ctx context.Context, id int64) error {
	if err := s.q.DeleteHabit(ctx, id); err != nil {
		return fmt.Errorf("delete habit %d: %w", id, err)
	}
	return nil
}

func (s *SQLiteStore) CreateCheckIn(ctx context.Context, habitID int64, day time.Time) error {
	err := s.q.CreateCheckIn(ctx, gen.CreateCheckInParams{
		HabitID:    habitID,
		OccurredOn: day.UTC().Format(dateFmt),
	})
	if err != nil {
		return fmt.Errorf("create checkin for habit %d:%w", habitID, err)
	}
	return nil
}

func (s *SQLiteStore) ListCheckIns(ctx context.Context, habitID int64) ([]time.Time, error) {
	rows, err := s.q.ListCheckIns(ctx, habitID)
	if err != nil {
		return nil, fmt.Errorf("list checkins for habit %d: %w", habitID, err)
	}
	out := make([]time.Time, 0, len(rows))
	for _, r := range rows {
		t, err := time.Parse(dateFmt, r)
		if err != nil {
			return nil, fmt.Errorf("parse checkin date %q: %w", r, err)
		}
		out = append(out, t)
	}
	return out, nil
}
