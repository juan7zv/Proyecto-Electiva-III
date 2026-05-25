/**
 * Archivo: middleware/auth.go
 * Propósito: Proteger los endpoints que requieren acceso seguro.
 * Mecanismo: Este código extrae el Cookie "access_token" y decodifica el JWT.
 * Decisiones:
 * - Se asume inyección segura del secret. Si el Secret encaja, el ID se cuelga
 *   en el "Context", permitiendo a los controladores operar en nombre de dicho usuario.
 */
package middleware

import (
	"fmt"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString, err := c.Cookie("access_token")
		if err != nil || tokenString == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Sin acceso (Token nulo)"})
			return
		}

		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			secret = "secreto-jwt-backend-split" // Solo preventivo local
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("Método de firmado inesperado")
			}
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Token caduco o inválido"})
			return
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			c.Set("user_id", claims["user_id"])
			c.Next()
		} else {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Claims inválidos"})
		}
	}
}
