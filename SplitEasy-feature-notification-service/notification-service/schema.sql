-- ============================================================
-- SplitEasy — Notification Service
-- Script DDL para PostgreSQL
-- ============================================================

-- Tabla principal de notificaciones
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

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id   ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read      ON notifications (user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_type      ON notifications (type);
CREATE INDEX IF NOT EXISTS idx_notifications_created   ON notifications (created_at DESC);
