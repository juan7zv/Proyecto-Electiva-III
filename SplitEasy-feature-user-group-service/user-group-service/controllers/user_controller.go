/**
 * Archivo: controllers/user_controller.go
 * Propósito: Gestionar el perfil público del usuario disociado de sus credenciales.
 */
package controllers

import (
	"database/sql"
	"net/http"

	"github.com/Belpoo/SplitEasy/user-group-service/db"
	"github.com/gin-gonic/gin"
)

type MeResponse struct {
	ID          string `json:"id"`
	DisplayName string `json:"display_name"`
	AvatarURL   string `json:"avatar_url"`
}

func GetMe(c *gin.Context) {
	userID := c.MustGet("user_id").(string)

	var res MeResponse
	err := db.DB.QueryRow(`
		SELECT id, COALESCE(display_name, ''), COALESCE(avatar_url, '') 
		FROM profiles WHERE id=$1`, userID).
		Scan(&res.ID, &res.DisplayName, &res.AvatarURL)

	if err != nil {
		if err == sql.ErrNoRows {
			// Si no existe, lo creamos lazily la primera vez
			_, createErr := db.DB.Exec(`INSERT INTO profiles (id, display_name) VALUES ($1, 'Usuario Nuevo')`, userID)
			if createErr == nil {
				res.ID = userID
				res.DisplayName = "Usuario Nuevo"
				c.JSON(http.StatusOK, res)
				return
			}
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error interno del servidor consultando perfil"})
		return
	}

	c.JSON(http.StatusOK, res)
}

func UpdateMe(c *gin.Context) {
	userID := c.MustGet("user_id").(string)

	var req struct {
		DisplayName string `json:"display_name"`
		AvatarURL   string `json:"avatar_url"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Upsert query
	_, err := db.DB.Exec(`
		INSERT INTO profiles (id, display_name, avatar_url)
		VALUES ($1, $2, $3)
		ON CONFLICT (id) DO UPDATE 
		SET display_name = EXCLUDED.display_name, avatar_url = EXCLUDED.avatar_url`,
		userID, req.DisplayName, req.AvatarURL)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "No se pudo actualizar el perfil"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Perfil actualizado correctamente"})
}
