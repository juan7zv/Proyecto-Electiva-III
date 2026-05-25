/**
 * Archivo: tests/expense_test.go
 * Propósito: Testing de Invarianza de Deuda.
 * Verifica estrictamente que divisiones matemáticamente inválidas detienen el registro asíncrono.
 */
package tests

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Belpoo/SplitEasy/expense-service/controllers"
	"github.com/Belpoo/SplitEasy/expense-service/db"
	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
)

func TestCreateExpense_OwedMismatchesTotal_ShouldReturn400(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.Default()

	r.POST("/expenses", controllers.CreateExpense)

	// Gasto de: Monto Total $90,000 COP
	// Splits de 30 y 30. Faltan 30. = $60,000. Debe generar Error 400.
	payload := []byte(`{
		"group_id": "grupo-fake-1",
		"amount": 90000.0,
		"description": "Cena compartida pero matematicas malas",
		"splits": [
			{"user_id": "A", "amount_owed": 30000.0},
			{"user_id": "B", "amount_owed": 30000.0}
		]
	}`)

	req, _ := http.NewRequest("POST", "/expenses", bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "00000000-0000-4000-8000-000000000001")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("Las matematicas malas debieron arrojar status 400, en cambio fue %d", w.Code)
	}
}

func TestDeleteExpense_ByOwner(t *testing.T) {
	mockDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("No se pudo crear sqlmock: %v", err)
	}
	defer mockDB.Close()
	db.DB = mockDB

	mock.ExpectQuery("SELECT paid_by FROM expenses").
		WithArgs("123").
		WillReturnRows(sqlmock.NewRows([]string{"paid_by"}).AddRow("user-1"))
	mock.ExpectExec("DELETE FROM expenses").
		WithArgs("123").
		WillReturnResult(sqlmock.NewResult(0, 1))

	gin.SetMode(gin.TestMode)
	r := gin.Default()
	r.DELETE("/expenses/:id", controllers.DeleteExpense)

	req, _ := http.NewRequest("DELETE", "/expenses/123", nil)
	req.Header.Set("X-User-ID", "user-1")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Se esperaba eliminar con 200 OK, recibimos %d", w.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("No se cumplieron las expectativas SQL: %v", err)
	}
}
