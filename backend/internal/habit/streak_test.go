package habit

import (
	"testing"
	"time"
)

func TestCurrentStreakDaily(t *testing.T) {
	today := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	tests := []struct {
		name     string
		checkIns []time.Time
		want     int
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

func TestCurrentStreakWeekly(t *testing.T) {
	tests := []struct {
		name     string
		today    time.Time
		checkIns []time.Time
		want     int
	}{
		{
			name:  "three consecutive weeks ending this week",
			today: date(2026, 5, 20), // Wed, ISO 2026-W21
			checkIns: []time.Time{
				date(2026, 5, 20), // W21
				date(2026, 5, 13), // W20
				date(2026, 5, 6),  // W19
			},
			want: 3,
		},
		{
			name:  "this week missing",
			today: date(2026, 5, 20), // W21, no check-in
			checkIns: []time.Time{
				date(2026, 5, 13), // W20
				date(2026, 5, 6),  // W19
			},
			want: 0,
		},
		{
			name:  "gap breaks the streak",
			today: date(2026, 5, 20), // W21
			checkIns: []time.Time{
				date(2026, 5, 20), // W21
				date(2026, 5, 6),  // W19 (W20 missing)
			},
			want: 1,
		},
		{
			name:  "two check-ins in one week count once",
			today: date(2026, 5, 20), // W21
			checkIns: []time.Time{
				date(2026, 5, 18), // Mon, W21
				date(2026, 5, 20), // Wed, W21
			},
			want: 1,
		},
		{
			name:  "sunday and monday are different ISO weeks",
			today: date(2026, 5, 18), // Mon, W21
			checkIns: []time.Time{
				date(2026, 5, 18), // Mon, W21
				date(2026, 5, 17), // Sun, W20
			},
			want: 2,
		},
		{
			name:  "spans the year boundary",
			today: date(2027, 1, 6), // ISO 2027-W01
			checkIns: []time.Time{
				date(2027, 1, 6),   // 2027-W01
				date(2026, 12, 30), // 2026-W53
				date(2026, 12, 23), // 2026-W52
			},
			want: 3,
		},
		{
			// Regression test for the isoWeekKey fix in Chapter 7. The old
			// home-rolled key collided weeks 10 and 41 (both formatted as "10"),
			// which would have reported a phantom streak of 1 here.
			name:     "weeks 10 and 41 must not collide",
			today:    date(2026, 10, 7),             // ISO 2026-W41
			checkIns: []time.Time{date(2026, 3, 4)}, // ISO 2026-W10
			want:     0,
		},
		{
			name:     "empty list",
			today:    date(2026, 5, 20),
			checkIns: nil,
			want:     0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CurrentStreak(Weekly, tt.today, tt.checkIns)
			if got != tt.want {
				t.Fatalf("got %d, want %d", got, tt.want)
			}
		})
	}

}

func TestLongestStreakDaily(t *testing.T) {
	tests := []struct {
		name     string
		checkIns []time.Time
		want     int
	}{
		{
			name: "three then gap then two, longest is three",
			checkIns: []time.Time{
				date(2026, 5, 1), date(2026, 5, 2), date(2026, 5, 3),
				date(2026, 5, 10), date(2026, 5, 11),
			},
			want: 3,
		},
		{
			name: "later run is the longest",
			checkIns: []time.Time{
				date(2026, 5, 1), date(2026, 5, 2),
				date(2026, 5, 10), date(2026, 5, 11), date(2026, 5, 12),
			},
			want: 3,
		},
		{
			name: "unordered input still finds the run",
			checkIns: []time.Time{
				date(2026, 5, 3), date(2026, 5, 1), date(2026, 5, 2),
			},
			want: 3,
		},
		{
			name: "duplicate day counts once",
			checkIns: []time.Time{
				date(2026, 5, 1), date(2026, 5, 1), date(2026, 5, 2),
			},
			want: 2,
		},
		{
			name:     "single check-in",
			checkIns: []time.Time{date(2026, 5, 1)},
			want:     1,
		},
		{
			name:     "empty list",
			checkIns: nil,
			want:     0,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := LongestStreak(Daily, tt.checkIns)
			if got != tt.want {
				t.Fatalf("got %d, want %d", got, tt.want)
			}
		})
	}
}

func TestLongestStreakWeekly(t *testing.T) {
	tests := []struct {
		name     string
		checkIns []time.Time
		want     int
	}{
		{
			name: "three consecutive weeks",
			checkIns: []time.Time{
				date(2026, 5, 6),  // W19
				date(2026, 5, 13), // W20
				date(2026, 5, 20), // W21
			},
			want: 3,
		},
		{
			name: "gap breaks the run",
			checkIns: []time.Time{
				date(2026, 5, 6),  // W19
				date(2026, 5, 20), // W21 (W20 missing)
			},
			want: 1,
		},
		{
			name: "two check-ins in one week count once",
			checkIns: []time.Time{
				date(2026, 5, 18), // Mon, W21
				date(2026, 5, 20), // Wed, W21
			},
			want: 1,
		},
		{
			name: "run spans the year boundary",
			checkIns: []time.Time{
				date(2026, 12, 23), // 2026-W52
				date(2026, 12, 30), // 2026-W53
				date(2027, 1, 6),   // 2027-W01
			},
			want: 3,
		},
		{
			// Adjacent calendar days in DIFFERENT ISO weeks. Every other case
			// above uses the same weekday, so the weekday-to-Monday offset math
			// in weekOrdinal cancels out and is never exercised. A Sunday + the
			// following Monday is the case that pins it down.
			name: "sunday then monday are two consecutive weeks",
			checkIns: []time.Time{
				date(2026, 5, 17), // Sun, W20
				date(2026, 5, 18), // Mon, W21
			},
			want: 2,
		},
		{
			name:     "empty list",
			checkIns: nil,
			want:     0,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := LongestStreak(Weekly, tt.checkIns)
			if got != tt.want {
				t.Fatalf("got %d, want %d", got, tt.want)
			}
		})
	}
}

func date(y int, m time.Month, d int) time.Time {
	return time.Date(y, m, d, 0, 0, 0, 0, time.UTC)
}
