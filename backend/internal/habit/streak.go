package habit

import (
	"fmt"
	"time"
)

type Schedule string

const (
	Daily  Schedule = "daily"
	Weekly Schedule = "weekly"
)

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

const dateFmt = "2006-01-02"

func weeklyStreak(today time.Time, checkIns []time.Time) int {
	weeks := make(map[string]bool, len(checkIns))
	for _, c := range checkIns {
		weeks[isoWeekKey(c.UTC())] = true
	}

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

func dailyStreak(today time.Time, checkIns []time.Time) int {
	days := make(map[string]bool, len(checkIns))
	for _, c := range checkIns {

		days[c.UTC().Format(dateFmt)] = true
	}
	streak := 0
	cursor := startOfDay(today)
	for {
		key := cursor.Format(dateFmt)
		if !days[key] {
			break
		}
		streak++
		cursor = cursor.AddDate(0, 0, -1)
	}
	return streak
}

func startOfDay(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
}

func isoWeekKey(t time.Time) string {
	y, w := t.ISOWeek()
	return fmt.Sprintf("%04d-W%02d", y, w)
}
