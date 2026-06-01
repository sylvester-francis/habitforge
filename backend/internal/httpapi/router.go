package httpapi

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/sylvester/habitforge/backend/internal/store"
)

type API struct {
	Store store.Store
}

func appHeader() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("X-App", "habitforge")
			next.ServeHTTP(w, r)
		})
	}
}
func NewRouter(api *API) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(appHeader())
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(15 * time.Second))

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("OK"))

	})
	r.Route("/api/habits", func(r chi.Router) {
		r.Get("/", listHabits)
		r.Post("/", createHabit)
		r.Get("/{id}", getHabit)
		r.Delete("/{id}", deleteHabit)
		r.Post("/{id}/checkins", createCheckIn)
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
