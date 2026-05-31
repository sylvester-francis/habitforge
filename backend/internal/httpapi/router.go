package httpapi

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func appHeader() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("X-App", "habitforge")
			next.ServeHTTP(w, r)
		})
	}
}
func NewRouter() http.Handler {
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
