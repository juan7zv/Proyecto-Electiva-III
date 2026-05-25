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
	var err error
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "postgres://usr:pwd@localhost:5432/usergroupdb?sslmode=disable"
	}

	DB, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Error abriendo PostgreSQL: %v", err)
	}

	for attempt := 1; attempt <= 15; attempt++ {
		if err = DB.Ping(); err == nil {
			log.Println("Conexion exitosa a la Base de Datos User Group")
			createTables()
			return
		}
		log.Printf("Esperando PostgreSQL User Group, intento %d/15: %v", attempt, err)
		time.Sleep(2 * time.Second)
	}

	log.Printf("Advertencia: No se pudo conectar a PostgreSQL User Group despues de reintentos: %v", err)
}

func createTables() {
	query := `
	CREATE EXTENSION IF NOT EXISTS "pgcrypto";

	CREATE TABLE IF NOT EXISTS profiles (
		id UUID PRIMARY KEY,
		display_name VARCHAR(100),
		avatar_url TEXT,
		created_at TIMESTAMP DEFAULT NOW()
	);

	CREATE TABLE IF NOT EXISTS groups (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		name VARCHAR(100) NOT NULL,
		description TEXT,
		created_by UUID NOT NULL REFERENCES profiles(id),
		created_at TIMESTAMP DEFAULT NOW()
	);

	CREATE TABLE IF NOT EXISTS group_members (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
		user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
		role VARCHAR(10) CHECK (role IN ('admin', 'member')) DEFAULT 'member',
		joined_at TIMESTAMP DEFAULT NOW(),
		UNIQUE(group_id, user_id)
	);`

	_, err := DB.Exec(query)
	if err != nil {
		log.Printf("Error ejecutando esquema DB: %v", err)
	}
}
