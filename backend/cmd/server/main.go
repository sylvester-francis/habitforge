package main

import (
	"log"
	"net/http"
	"os"

	"github.com/sylvester/habitforge/backend/internal/httpapi"
	"github.com/sylvester/habitforge/backend/internal/store"
)

func main() {
	addr := os.Getenv("HABIT_FORGE_ADDR")
	if addr == "" {
		addr = ":8080"
	}
	s, err := store.OpenSQLite("habitforge.db")
	if err != nil {
		log.Fatalf("open store: %v", err)
	}
	r := httpapi.NewRouter(&httpapi.API{Store: s})
	log.Printf("listening on %s", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("failed to start the server: %v", err)
	}
}
