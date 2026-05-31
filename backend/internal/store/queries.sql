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