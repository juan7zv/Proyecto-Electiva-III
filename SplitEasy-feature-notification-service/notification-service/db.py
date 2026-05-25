# ============================================================
# SplitEasy — Notification Service
# Módulo de conexión y helpers de PostgreSQL
# ============================================================

import os
import psycopg2
from psycopg2.extras import RealDictCursor

def get_connection():
    """Obtiene una conexión a PostgreSQL usando la variable DATABASE_URL."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("La variable de entorno DATABASE_URL no está configurada.")
    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)


def init_db():
    """Inicializa la base de datos creando la tabla si no existe."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS notifications (
                    id              SERIAL PRIMARY KEY,
                    user_id         VARCHAR(100)   NOT NULL,
                    type            VARCHAR(30)    NOT NULL
                                        CHECK (type IN ('expense_created', 'debt_settled', 'member_joined')),
                    message         TEXT           NOT NULL,
                    group_name      VARCHAR(150)   NOT NULL DEFAULT '',
                    amount          NUMERIC(12, 2)          DEFAULT NULL,
                    read            BOOLEAN        NOT NULL DEFAULT FALSE,
                    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_notifications_user_id   ON notifications (user_id);
                CREATE INDEX IF NOT EXISTS idx_notifications_read      ON notifications (user_id, read);
                CREATE INDEX IF NOT EXISTS idx_notifications_type      ON notifications (type);
                CREATE INDEX IF NOT EXISTS idx_notifications_created   ON notifications (created_at DESC);
            """)
        conn.commit()
        print("✅ Base de datos inicializada correctamente.")
    except Exception as e:
        print(f"❌ Error inicializando la base de datos: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


def seed_demo_data():
    """Inserta datos de demostración si la tabla está vacía."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) as count FROM notifications;")
            result = cur.fetchone()
            if result["count"] > 0:
                print("ℹ️  La tabla ya tiene datos, no se insertan datos de demostración.")
                return

            # Datos de ejemplo para visualizar la interfaz
            demo_data = [
                ("user_1", "expense_created", "Carlos registró un gasto de $45.00 en Cena Viernes", "Roommates 🏠", 45.00, False),
                ("user_1", "debt_settled", "María saldó su deuda de $22.50 contigo", "Viaje Cartagena ✈️", 22.50, False),
                ("user_1", "member_joined", "Andrés se unió al grupo", "Oficina Almuerzos 🍽️", None, False),
                ("user_1", "expense_created", "Laura registró un gasto de $120.00 en Supermercado", "Roommates 🏠", 120.00, True),
                ("user_1", "debt_settled", "Pedro saldó su deuda de $15.75 contigo", "Oficina Almuerzos 🍽️", 15.75, True),
                ("user_1", "member_joined", "Sofía se unió al grupo", "Viaje Cartagena ✈️", None, False),
                ("user_1", "expense_created", "Tú registraste un gasto de $89.90 en Gasolina", "Roommates 🏠", 89.90, False),
                ("user_1", "debt_settled", "Juan saldó su deuda de $33.25 contigo", "Roommates 🏠", 33.25, False),
            ]

            for data in demo_data:
                cur.execute("""
                    INSERT INTO notifications (user_id, type, message, group_name, amount, read, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, NOW() - INTERVAL '%s minutes');
                """, (*data, demo_data.index(data) * 37 + 5))

        conn.commit()
        print(f"✅ Se insertaron {len(demo_data)} notificaciones de demostración.")
    except Exception as e:
        print(f"❌ Error insertando datos de demostración: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()
