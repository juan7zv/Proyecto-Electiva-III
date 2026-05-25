/**
 * Archivo: controllers/expense_controller.go
 * Propósito: Gestionar el Core lógico-transaccional monetario.
 * Decisiones:
 * - Valida firmemente que SUMA(Splits) === Expense.Amount para prevenir corrupción fiduciaria.
 * - Despacha siempre el evento PublishExpenseEvent que encolará de forma Async para el Debt Calculator.
 */
package controllers

import (
	"database/sql"
	"math"
	"net/http"

	"github.com/Belpoo/SplitEasy/expense-service/broker"
	"github.com/Belpoo/SplitEasy/expense-service/db"
	"github.com/gin-gonic/gin"
)

// Para un mock simplificado de Auth usaremos la cabecera / cookie inyectada "user_id_debug" durante pruebas de esta vista,
// Ya que Expense Service no hace checkAuth real sino api gateway.
func getUserID(c *gin.Context) string {
	return c.GetHeader("X-User-ID") // Gateway nos pasaría el UserID autenticado a través de headers proxy
}

type SplitInput struct {
	UserID     string  `json:"user_id" binding:"required"`
	AmountOwed float64 `json:"amount_owed" binding:"required"`
}

type CreateExpenseInput struct {
	GroupID     string       `json:"group_id" binding:"required"`
	Amount      float64      `json:"amount" binding:"required"`
	Description string       `json:"description"`
	Splits      []SplitInput `json:"splits" binding:"required"`
}

func CreateExpense(c *gin.Context) {
	paidBy := getUserID(c)
	if paidBy == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario autenticado requerido"})
		return
	}

	var req CreateExpenseInput
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// VALIDACIÓN CRÍTICA:
	var totalSplits float64 = 0
	for _, s := range req.Splits {
		totalSplits += s.AmountOwed
	}

	// Evitar errores de coma flotante de hardware
	if math.Abs(totalSplits-req.Amount) > 0.01 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "La suma de la división de gastos de los miembros no equivale al monto base del gasto en sí"})
		return
	}

	tx, err := db.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error interno TX"})
		return
	}

	var expenseID string
	err = tx.QueryRow(`
		INSERT INTO expenses (group_id, paid_by, amount, description) 
		VALUES ($1, $2, $3, $4) RETURNING id`,
		req.GroupID, paidBy, req.Amount, req.Description).Scan(&expenseID)

	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error guardando gasto cabecera"})
		return
	}

	for _, s := range req.Splits {
		// ¿Este split me lo debo yo mismo?
		paidStatus := false
		if s.UserID == paidBy {
			paidStatus = true
		}

		_, err := tx.Exec(`
			INSERT INTO expense_splits (expense_id, user_id, amount_owed, paid)
			VALUES ($1, $2, $3, $4)`,
			expenseID, s.UserID, s.AmountOwed, paidStatus)

		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error guardando las partes divisionarias"})
			return
		}
	}

	tx.Commit()

	// 2. DISPARAR EVENTO ASINCRONO POR BROKER -- Este es el CORE AJUSTE DE ASIGNATURA.
	brokerPayload := broker.ExpenseCreatedEvent{
		ExpenseID: expenseID,
		GroupID:   req.GroupID,
		PaidBy:    paidBy,
		Amount:    req.Amount,
		Splits:    make([]broker.SplitPayload, len(req.Splits)),
	}
	for i, sp := range req.Splits {
		brokerPayload.Splits[i] = broker.SplitPayload{
			UserID:     sp.UserID,
			AmountOwed: sp.AmountOwed,
		}
	}

	// Publicación NO - BLOQUEANTE
	go broker.PublishExpenseEvent(brokerPayload)

	c.JSON(http.StatusCreated, gin.H{
		"message":    "Gasto registrado exitosamente",
		"expense_id": expenseID,
	})
}

// Para efectos del test o simplificacion el mock se limitara a Create y Get.
func ListGroupExpenses(c *gin.Context) {
	groupID := c.Query("group_id")
	if groupID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "group_id url query is required"})
		return
	}

	rows, err := db.DB.Query(`SELECT id, paid_by, amount, description FROM expenses WHERE group_id=$1`, groupID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error listando gastos"})
		return
	}
	defer rows.Close()

	var expenses []map[string]interface{}
	for rows.Next() {
		var id, paidBy, desc string
		var amount float64
		rows.Scan(&id, &paidBy, &amount, &desc)
		expenses = append(expenses, map[string]interface{}{
			"id": id, "paid_by": paidBy, "amount": amount, "description": desc,
		})
	}

	c.JSON(http.StatusOK, expenses)
}

func DeleteExpense(c *gin.Context) {
	userID := getUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario autenticado requerido"})
		return
	}

	id := c.Param("id")
	var paidBy string
	err := db.DB.QueryRow("SELECT paid_by FROM expenses WHERE id=$1", id).Scan(&paidBy)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Gasto no encontrado"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error consultando gasto"})
		return
	}
	if paidBy != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Solo quien registro el gasto puede eliminarlo"})
		return
	}

	_, err = db.DB.Exec("DELETE FROM expenses WHERE id=$1", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error borrando"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Gasto eliminado"})
}
