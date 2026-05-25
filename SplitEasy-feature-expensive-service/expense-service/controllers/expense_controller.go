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
	"log"
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
		log.Printf("expense create rejected: missing authenticated user")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario autenticado requerido"})
		return
	}

	var req CreateExpenseInput
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("expense create invalid payload: user_id=%s error=%s", paidBy, err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	log.Printf("expense create started: group_id=%s paid_by=%s amount=%.2f splits=%d", req.GroupID, paidBy, req.Amount, len(req.Splits))

	// VALIDACIÓN CRÍTICA:
	var totalSplits float64 = 0
	for _, s := range req.Splits {
		totalSplits += s.AmountOwed
	}

	// Evitar errores de coma flotante de hardware
	if math.Abs(totalSplits-req.Amount) > 0.01 {
		log.Printf("expense create rejected: group_id=%s paid_by=%s amount=%.2f splits_total=%.2f", req.GroupID, paidBy, req.Amount, totalSplits)
		c.JSON(http.StatusBadRequest, gin.H{"error": "La suma de la división de gastos de los miembros no equivale al monto base del gasto en sí"})
		return
	}

	tx, err := db.DB.Begin()
	if err != nil {
		log.Printf("expense create tx failed: group_id=%s paid_by=%s error=%s", req.GroupID, paidBy, err.Error())
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
		log.Printf("expense create header insert failed: group_id=%s paid_by=%s error=%s", req.GroupID, paidBy, err.Error())
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
			log.Printf("expense create split insert failed: expense_id=%s user_id=%s error=%s", expenseID, s.UserID, err.Error())
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error guardando las partes divisionarias"})
			return
		}
	}

	if err := tx.Commit(); err != nil {
		log.Printf("expense create commit failed: expense_id=%s error=%s", expenseID, err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error confirmando gasto"})
		return
	}
	log.Printf("expense create persisted: expense_id=%s group_id=%s", expenseID, req.GroupID)

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
	log.Printf("expense created event queued: expense_id=%s group_id=%s splits=%d", expenseID, req.GroupID, len(req.Splits))

	c.JSON(http.StatusCreated, gin.H{
		"message":    "Gasto registrado exitosamente",
		"expense_id": expenseID,
	})
}

// Para efectos del test o simplificacion el mock se limitara a Create y Get.
func ListGroupExpenses(c *gin.Context) {
	groupID := c.Query("group_id")
	if groupID == "" {
		log.Printf("expense list rejected: missing group_id")
		c.JSON(http.StatusBadRequest, gin.H{"error": "group_id url query is required"})
		return
	}
	log.Printf("expense list started: group_id=%s", groupID)

	rows, err := db.DB.Query(`SELECT id, paid_by, amount, description FROM expenses WHERE group_id=$1`, groupID)
	if err != nil {
		log.Printf("expense list query failed: group_id=%s error=%s", groupID, err.Error())
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
	if err := rows.Err(); err != nil {
		log.Printf("expense list rows failed: group_id=%s error=%s", groupID, err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error leyendo gastos"})
		return
	}
	log.Printf("expense list finished: group_id=%s count=%d", groupID, len(expenses))

	c.JSON(http.StatusOK, expenses)
}

func DeleteExpense(c *gin.Context) {
	userID := getUserID(c)
	if userID == "" {
		log.Printf("expense delete rejected: missing authenticated user")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario autenticado requerido"})
		return
	}

	id := c.Param("id")
	log.Printf("expense delete started: expense_id=%s user_id=%s", id, userID)
	var paidBy string
	err := db.DB.QueryRow("SELECT paid_by FROM expenses WHERE id=$1", id).Scan(&paidBy)
	if err == sql.ErrNoRows {
		log.Printf("expense delete not found: expense_id=%s user_id=%s", id, userID)
		c.JSON(http.StatusNotFound, gin.H{"error": "Gasto no encontrado"})
		return
	}
	if err != nil {
		log.Printf("expense delete lookup failed: expense_id=%s user_id=%s error=%s", id, userID, err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error consultando gasto"})
		return
	}
	if paidBy != userID {
		log.Printf("expense delete forbidden: expense_id=%s user_id=%s paid_by=%s", id, userID, paidBy)
		c.JSON(http.StatusForbidden, gin.H{"error": "Solo quien registro el gasto puede eliminarlo"})
		return
	}

	_, err = db.DB.Exec("DELETE FROM expenses WHERE id=$1", id)
	if err != nil {
		log.Printf("expense delete failed: expense_id=%s user_id=%s error=%s", id, userID, err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error borrando"})
		return
	}
	log.Printf("expense delete finished: expense_id=%s user_id=%s", id, userID)
	c.JSON(http.StatusOK, gin.H{"message": "Gasto eliminado"})
}
