package httpapi

import (
	"net/http"
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
		r.Get("/", api.listHabits)
		r.Post("/", api.createHabit)
		r.Get("/{id}", api.getHabit)
		r.Delete("/{id}", api.deleteHabit)
		r.Post("/{id}/checkins", api.createCheckIn)
	})
	return r
}
