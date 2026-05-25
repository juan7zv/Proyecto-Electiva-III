package db

import (
	"database/sql"
	"log"
	"os"
	"time"

	_ "github.com/lib/pq"
)

var DB *sql.DB

func InitDB() {
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "postgres://exp_user:exp_pwd@localhost:5434/exp_db?sslmode=disable"
	}

	var err error
	DB, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Error de inicio en driver DB de Gastos: %v", err)
	}

	for attempt := 1; attempt <= 15; attempt++ {
		if err = DB.Ping(); err == nil {
			createTables()
			return
		}
		log.Printf("Esperando PostgreSQL Expense, intento %d/15: %v", attempt, err)
		time.Sleep(2 * time.Second)
	}

	log.Printf("Aviso: Fallo conexion PG Expense despues de reintentos: %v", err)
}

func createTables() {
	query := `
	CREATE EXTENSION IF NOT EXISTS "pgcrypto";

	CREATE TABLE IF NOT EXISTS expenses (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		group_id UUID NOT NULL,
		paid_by UUID NOT NULL,
		amount DECIMAL(12,2) NOT NULL,
		description VARCHAR(255),
		created_at TIMESTAMP DEFAULT NOW()
	);

	CREATE TABLE IF NOT EXISTS expense_splits (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
		user_id UUID NOT NULL,
		amount_owed DECIMAL(12,2) NOT NULL,
		paid BOOLEAN DEFAULT FALSE,
		settled_at TIMESTAMP
	);`

	if _, err := DB.Exec(query); err != nil {
		log.Printf("Fallo montando tablas en BD Expense: %v", err)
	} else {
		log.Println("Tablas DB Expense iniciadas (expenses, expense_splits)")
	}
}
