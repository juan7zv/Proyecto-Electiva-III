/**
 * Archivo: main.go
 * Propósito: Punto de entrada del microservicio Expense. Atiende tráfico de transaccionales y encola notificaciones.
 */
package main

import (
	"log"
	"net/http"
	"os"

	"github.com/Belpoo/SplitEasy/expense-service/controllers"
	"github.com/Belpoo/SplitEasy/expense-service/db"
	"github.com/gin-gonic/gin"
)

func gatewayOnlyMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		secret := os.Getenv("GATEWAY_SHARED_SECRET")
		if secret == "" || c.Request.URL.Path == "/health" {
			c.Next()
			return
		}
		if c.GetHeader("X-Gateway-Secret") != secret {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Acceso permitido solo desde API Gateway"})
			return
		}
		c.Next()
	}
}

func main() {
	db.InitDB()
	r := gin.Default()
	r.Use(gatewayOnlyMiddleware())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "expense-service"})
	})

	expenseRoutes := r.Group("/expenses")
	{
		expenseRoutes.POST("", controllers.CreateExpense)
		expenseRoutes.GET("", controllers.ListGroupExpenses)
		expenseRoutes.DELETE("/:id", controllers.DeleteExpense)
		// Edit & Get single endpoints estarían aquí.
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081" // distinct from user-group default
	}

	log.Printf("Iniciando microservicio de Gastos locales en puerto %s...", port)
	r.Run(":" + port)
}
