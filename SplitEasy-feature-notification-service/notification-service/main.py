# ============================================================
# SplitEasy — Notification Service
# Punto de entrada principal (Functions Framework / Serverless)
# ============================================================

import os
import json
import functions_framework
from flask import jsonify, request
from flask_cors import cross_origin
from dotenv import load_dotenv
from db import get_connection, init_db, seed_demo_data

# Cargar variables de entorno desde .env (solo en local)
load_dotenv()

# Inicializar la base de datos al arrancar
try:
    init_db()
    seed_demo_data()
except Exception as e:
    print(f"⚠️  No se pudo inicializar la DB al arrancar: {e}")


@functions_framework.http
def handle_request(request):
    """
    Punto de entrada HTTP del servicio serverless.
    Enruta las peticiones según el método y path.
    """
    # Manejar CORS preflight
    if request.method == "OPTIONS":
        headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "3600",
        }
        return ("", 204, headers)

    # Headers CORS para todas las respuestas
    cors_headers = {"Access-Control-Allow-Origin": "*"}

    path = request.path
    method = request.method

    try:
        # === RUTA: Health check ===
        if path == "/" or path == "/health":
            return (jsonify({"status": "ok", "service": "notification-service"}), 200, cors_headers)

        # === RUTA: Obtener notificaciones de un usuario ===
        if path == "/notifications" and method == "GET":
            user_id = request.args.get("user_id", "user_1")
            notif_type = request.args.get("type")  # Filtro opcional por tipo
            return (jsonify(get_notifications(user_id, notif_type)), 200, cors_headers)

        # === RUTA: Crear una notificación (trigger desde otro servicio) ===
        if path == "/notifications" and method == "POST":
            data = request.get_json(force=True)
            result = create_notification(data)
            return (jsonify(result), 201, cors_headers)

        # === RUTA: Marcar UNA notificación como leída ===
        if path.startswith("/notifications/") and path.endswith("/read") and method == "PATCH":
            notif_id = path.split("/")[2]
            result = mark_as_read(notif_id)
            return (jsonify(result), 200, cors_headers)

        # === RUTA: Marcar TODAS como leídas ===
        if path == "/notifications/read-all" and method == "PATCH":
            user_id = request.args.get("user_id", "user_1")
            result = mark_all_as_read(user_id)
            return (jsonify(result), 200, cors_headers)

        # === Ruta no encontrada ===
        return (jsonify({"error": "Ruta no encontrada"}), 404, cors_headers)

    except Exception as e:
        print(f"❌ Error en la petición: {e}")
        return (jsonify({"error": str(e)}), 500, cors_headers)


# ============================================================
# Funciones de lógica de negocio
# ============================================================

def get_notifications(user_id, notif_type=None):
    """Obtiene las notificaciones de un usuario, opcionalmente filtradas por tipo."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            if notif_type:
                cur.execute("""
                    SELECT id, user_id, type, message, group_name, 
                           amount::float, read, created_at
                    FROM notifications
                    WHERE user_id = %s AND type = %s
                    ORDER BY created_at DESC;
                """, (user_id, notif_type))
            else:
                cur.execute("""
                    SELECT id, user_id, type, message, group_name, 
                           amount::float, read, created_at
                    FROM notifications
                    WHERE user_id = %s
                    ORDER BY created_at DESC;
                """, (user_id,))
            rows = cur.fetchall()
            # Serializar timestamps a ISO string
            for row in rows:
                row["created_at"] = row["created_at"].isoformat()
            return rows
    finally:
        conn.close()


def create_notification(data):
    """Crea una nueva notificación en la base de datos."""
    required = ["user_id", "type", "message"]
    for field in required:
        if field not in data:
            raise ValueError(f"Campo requerido faltante: {field}")

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO notifications (user_id, type, message, group_name, amount)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, user_id, type, message, group_name, amount::float, read, created_at;
            """, (
                data["user_id"],
                data["type"],
                data["message"],
                data.get("group_name", ""),
                data.get("amount"),
            ))
            result = cur.fetchone()
            result["created_at"] = result["created_at"].isoformat()
        conn.commit()
        return result
    finally:
        conn.close()


def mark_as_read(notif_id):
    """Marca una notificación específica como leída."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE notifications SET read = TRUE
                WHERE id = %s
                RETURNING id, read;
            """, (notif_id,))
            result = cur.fetchone()
            if not result:
                raise ValueError(f"Notificación con id {notif_id} no encontrada.")
        conn.commit()
        return result
    finally:
        conn.close()


def mark_all_as_read(user_id):
    """Marca todas las notificaciones de un usuario como leídas."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE notifications SET read = TRUE
                WHERE user_id = %s AND read = FALSE
                RETURNING id;
            """, (user_id,))
            updated = cur.fetchall()
        conn.commit()
        return {"updated_count": len(updated), "message": "Todas las notificaciones marcadas como leídas."}
    finally:
        conn.close()
