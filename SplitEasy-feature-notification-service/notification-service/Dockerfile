# ============================================================
# Dockerfile — Notification Service (SplitEasy)
# Optimizado para despliegue en Render
# ============================================================

FROM python:3.11-slim

# Establecer directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema para psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

# Copiar e instalar dependencias de Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente
COPY . .

# Render asigna el puerto dinámicamente via $PORT
ENV PORT=8080

# Exponer el puerto para documentación
EXPOSE ${PORT}

# Ejecutar el servicio con functions-framework
# --target: nombre de la función HTTP en main.py
# --port: puerto dinámico asignado por Render ($PORT)
CMD exec functions-framework --target=handle_request --port=${PORT}
