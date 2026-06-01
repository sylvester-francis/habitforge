package httpapi

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("writeJSON: encode failed: %v", err)
	}
}
func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
func (a *API) listHabits(w http.ResponseWriter, r *http.Request) {
	habits, err := a.Store.ListHabits(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list habits")
		return
	}
	writeJSON(w, http.StatusOK, habits)
}

func (a *API) createHabit(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name     string `json:"name"`
		Schedule string `json:"schedule"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}
	if req.Schedule != "daily" && req.Schedule != "weekly" {
		writeError(w, http.StatusBadRequest, `schedule must be "daily" or "weekly"`)
		return
	}
	h, err := a.Store.CreateHabit(r.Context(), req.Name, req.Schedule)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create habit")
		return
	}
	writeJSON(w, http.StatusCreated, h)
}
func (a *API) getHabit(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}
	h, err := a.Store.GetHabit(r.Context(), id)
	if errors.Is(err, sql.ErrNoRows) {
		writeError(w, http.StatusNotFound, "habit not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load habit")
		return
	}
	writeJSON(w, http.StatusOK, h)
}

func (a *API) deleteHabit(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}
	if err := a.Store.DeleteHabit(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete habit")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) createCheckIn(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}
	// The server decides "today" in UTC. The client does not get to pick the
	// date — that keeps the streak rules honest and matches the Chapter 4 spec.
	if err := a.Store.CreateCheckIn(r.Context(), id, time.Now().UTC()); err != nil {
		writeError(w, http.StatusInternalServerError, "could not record check-in")
		return
	}
	w.WriteHeader(http.StatusCreated)
}
