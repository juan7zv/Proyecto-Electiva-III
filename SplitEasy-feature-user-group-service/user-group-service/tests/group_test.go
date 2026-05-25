/**
 * Archivo: tests/group_test.go
 * Propósito: Test unitarios para verificar fallas de Autorización.
 * Decisiones y cobertura:
 * Se valida explícitamente el requisito estricto en Invitar Miembros, donde
 * un usuario que carezca del rol Admin DEBE ser arrojado vía `403 Forbidden`.
 */
package tests

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Belpoo/SplitEasy/user-group-service/controllers"
	"github.com/Belpoo/SplitEasy/user-group-service/db"
	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
)

func TestInviteMember_WithoutAdminRole_ShouldReturn403(t *testing.T) {
	mockDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("No se pudo crear sqlmock: %v", err)
	}
	defer mockDB.Close()
	db.DB = mockDB
	mock.ExpectQuery("SELECT role FROM group_members").
		WithArgs("uuid-grupo", "id-falso-sin-bd-real").
		WillReturnRows(sqlmock.NewRows([]string{"role"}))

	gin.SetMode(gin.TestMode)
	r := gin.Default()

	// Simulador de Mocking del AuthRequired inyectando alguien.
	r.Use(func(c *gin.Context) {
		c.Set("user_id", "id-falso-sin-bd-real")
		c.Next()
	})

	r.POST("/groups/:id/members", controllers.InviteMember)

	// Mandar Payload simulando el request
	reqPayload := bytes.NewBuffer([]byte(`{"user_id": "victima-uuid"}`))
	req, _ := http.NewRequest("POST", "/groups/uuid-grupo/members", reqPayload)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	// Como el UUID falso ("id-falso-sin-bd-real") NO se hallará figurado como "admin"
	// de este UUIDGrupo en la db fake/offline, el query devuelve error obligandonos
	// a arrojar estado restrictivo 403.
	if w.Code != http.StatusForbidden {
		t.Fatalf("Se esperaba status 403 Forbidden pero recibimos %d. El Endpoint no verificó bien si era Admin", w.Code)
	}

	expectedBody := `{"error":"Sólo administradores pueden invitar nuevos miembros"}`
	if w.Body.String() != expectedBody {
		t.Fatalf("Difiere el body retornado. Fue: %s", w.Body.String())
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("No se cumplieron las expectativas SQL: %v", err)
	}
}
