package store
import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"time"
	gen "github.com/sylvester/habitforge/backend/internal/store/gen"
	_ "modernc.org/sqlite"
)

type SQLiteStore struct {
	db *sql.DB
	q *gen.Queries
}
func OpenSQLite(path string) (*SQLiteStore,error) {
	db, err := sql.Open("sqlite",path)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)		
	}
	if _, err := db.Exec("PRAGMA foreign_keys = ON;"); err != nil {
		return nil, fmt.Errorf("enable foreign keys: %w", err)		
	} 
	schema, err := os.ReadFile("migrations/0001_init.sql")
	if err != nil {
		return nil, fmt.Errorf("read schema: %w",err)
	}
	if _, err := db.Exec(string(schema)); err != nil {

	}
   return &SQLiteStore{db: db, q: gen.New(db)}, nil	
}

const dateFmt = "2006-01-02"

