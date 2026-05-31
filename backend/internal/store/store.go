package store

import (
	"time"
	"context"
)

type Habit struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Schedule  string    `json:"schedule"`
	CreatedAt time.Time `json:"createdAt"`
}

type Store interface {
	CreateHabit(ctx context.Context, name, schedule string) (Habit ,error)
	ListHabits(ctx context.Context) ([]Habit,error)
	GetHabit(ctx context.Context, id int64) (Habit,error)
	DeleteHabit(ctx context.Context, id int64) error
	createCheckIn(ctx context.Context, habitID int64, day time.Time) error
	ListCheckIns(ctx context.Context, habitID int64) ([]time.Time,error)
}