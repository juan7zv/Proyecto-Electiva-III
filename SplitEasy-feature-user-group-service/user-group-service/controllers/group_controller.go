/**
 * Archivo: controllers/group_controller.go
 * Propósito: Lógica de creación de grupos, invitación y asignación de admins.
 * Actualizado con List, Detail y Delete.
 */
package controllers

import (
	"net/http"

	"github.com/Belpoo/SplitEasy/user-group-service/db"
	"github.com/gin-gonic/gin"
)

type CreateGroupRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

func CreateGroup(c *gin.Context) {
	userID := c.MustGet("user_id").(string)
	var req CreateGroupRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx, err := db.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error interno"})
		return
	}

	_, err = tx.Exec(`
		INSERT INTO profiles (id, display_name)
		VALUES ($1, 'Usuario Nuevo')
		ON CONFLICT (id) DO NOTHING`, userID)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error preparando perfil del usuario"})
		return
	}

	var groupID string
	err = tx.QueryRow(`
		INSERT INTO groups (name, description, created_by)
		VALUES ($1, $2, $3) RETURNING id`,
		req.Name, req.Description, userID).Scan(&groupID)

	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error insertando el grupo"})
		return
	}

	_, err = tx.Exec(`
		INSERT INTO group_members (group_id, user_id, role)
		VALUES ($1, $2, 'admin')`,
		groupID, userID)

	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error vinculando rol de admin"})
		return
	}

	tx.Commit()

	c.JSON(http.StatusCreated, gin.H{
		"message":  "Grupo creado correctamente",
		"group_id": groupID,
	})
}

func ListGroups(c *gin.Context) {
	userID := c.MustGet("user_id").(string)

	rows, err := db.DB.Query(`
		SELECT g.id, g.name, g.description, m.role 
		FROM groups g
		INNER JOIN group_members m ON g.id = m.group_id
		WHERE m.user_id = $1`, userID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al obtener la lista de grupos"})
		return
	}
	defer rows.Close()

	var groups []map[string]interface{}
	for rows.Next() {
		var id, name, desc, role string
		rows.Scan(&id, &name, &desc, &role)
		groups = append(groups, map[string]interface{}{
			"id": id, "name": name, "description": desc, "my_role": role,
		})
	}

	c.JSON(http.StatusOK, groups)
}

func GetGroup(c *gin.Context) {
	userID := c.MustGet("user_id").(string)
	groupID := c.Param("id")

	// Verificar pertenencia prioritaria
	var exists bool
	db.DB.QueryRow(`SELECT EXISTS(SELECT 1 FROM group_members WHERE group_id=$1 AND user_id=$2)`, groupID, userID).Scan(&exists)
	if !exists {
		c.JSON(http.StatusForbidden, gin.H{"error": "No perteneces a este grupo"})
		return
	}

	var name, desc string
	err := db.DB.QueryRow(`SELECT name, description FROM groups WHERE id=$1`, groupID).Scan(&name, &desc)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Grupo no encontrado"})
		return
	}

	// Extraer miembros
	rows, _ := db.DB.Query(`SELECT user_id, role FROM group_members WHERE group_id=$1`, groupID)
	defer rows.Close()

	var members []map[string]string
	for rows.Next() {
		var uid, role string
		rows.Scan(&uid, &role)
		members = append(members, map[string]string{"user_id": uid, "role": role})
	}

	c.JSON(http.StatusOK, gin.H{
		"id":          groupID,
		"name":        name,
		"description": desc,
		"members":     members,
	})
}

func InviteMember(c *gin.Context) {
	userID := c.MustGet("user_id").(string)
	groupID := c.Param("id")

	var req struct {
		TargetUserID string `json:"user_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Se requiere ID del usuario a invitar"})
		return
	}

	var role string
	err := db.DB.QueryRow(`
		SELECT role FROM group_members 
		WHERE group_id=$1 AND user_id=$2`,
		groupID, userID).Scan(&role)
	if err != nil || role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Sólo administradores pueden invitar nuevos miembros"})
		return
	}

	tx, err := db.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error interno"})
		return
	}

	_, err = tx.Exec(`
		INSERT INTO profiles (id, display_name)
		VALUES ($1, 'Usuario Invitado')
		ON CONFLICT (id) DO NOTHING`, req.TargetUserID)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "El ID del usuario invitado debe ser un UUID valido"})
		return
	}

	_, err = tx.Exec(`
		INSERT INTO group_members (group_id, user_id, role)
		VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING`,
		groupID, req.TargetUserID)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error asignando al grupo"})
		return
	}

	tx.Commit()

	c.JSON(http.StatusOK, gin.H{"message": "Miembro invitado exitosamente"})
}

func RemoveMember(c *gin.Context) {
	userID := c.MustGet("user_id").(string)
	groupID := c.Param("id")
	targetID := c.Param("userId")

	var role string
	err := db.DB.QueryRow(`SELECT role FROM group_members WHERE group_id=$1 AND user_id=$2`, groupID, userID).Scan(&role)
	if err != nil || role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Sólo administradores pueden remover miembros"})
		return
	}

	// Prevenir auto-exclusión si es el único admin
	if userID == targetID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No te puedes remover a ti mismo de esta forma"})
		return
	}

	_, err = db.DB.Exec(`DELETE FROM group_members WHERE group_id=$1 AND user_id=$2`, groupID, targetID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "No se pudo eliminar al usuario"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Usuario eliminado del grupo"})
}
