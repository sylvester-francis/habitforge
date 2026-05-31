package httpapi

import (
	"encoding/json"
	"net/http"
)

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
	}
}
func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
func listHabits(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "soon")
}
func createHabit(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "soon")
}
func getHabit(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "soon")
}
func deleteHabit(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "soon")
}
func createCheckIn(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "soon")
}
