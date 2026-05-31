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