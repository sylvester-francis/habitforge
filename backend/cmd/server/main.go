package main

import (
	"log"
	"net/http"
	"os"

	"github.com/sylvester-francis/habitforge/backend/internal/httpapi"
)

func main() {
	addr := os.Getenv("HABIT_FORGE_ADDR")
	if addr == "" {
		addr = ":8080"
	}
	r := httpapi.NewRouter()
	log.Printf("listening on %s", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}
