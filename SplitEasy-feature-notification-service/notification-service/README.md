# Notification Service — SplitEasy

Microservicio serverless de notificaciones. Recibe eventos de gastos y deudas, los almacena en PostgreSQL y los sirve al frontend.

## Stack
- **Lenguaje:** Python 3.11
- **Framework:** Functions Framework (serverless HTTP)
- **Base de datos:** PostgreSQL
- **Despliegue:** Render (Docker)

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/notifications?user_id=X&type=Y` | Listar notificaciones (filtro opcional por tipo) |
| `POST` | `/notifications` | Crear nueva notificación |
| `PATCH` | `/notifications/:id/read` | Marcar una como leída |
| `PATCH` | `/notifications/read-all?user_id=X` | Marcar todas como leídas |

## Ejecución local

```bash
# 1. Crear y activar entorno virtual
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Linux/Mac

# 2. Instalar dependencias
pip install -r requirements.txt

# 3. Configurar la base de datos
cp .env.example .env
# Editar .env con tu DATABASE_URL local

# 4. Ejecutar
functions-framework --target=handle_request --port=8080
```

El servicio estará disponible en `http://localhost:8080`
