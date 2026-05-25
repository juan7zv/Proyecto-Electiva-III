# Archivo: Dockerfile para correr entorno Serverless emulado nativamente en Render WS
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org --no-cache-dir -r requirements.txt

COPY . .
EXPOSE 8080

# En modo Function Framework, emulamos la llamada
CMD ["sh", "-c", "functions-framework --target=generate_report --port ${PORT:-8080}"]
