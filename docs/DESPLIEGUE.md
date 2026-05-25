# Despliegue y ejecucion

## Ejecucion local recomendada

El despliegue local completo usa Docker Compose. Este modo levanta frontend, API Gateway, microservicios, PostgreSQL, Redis, RabbitMQ y MongoDB.

```powershell
cd C:\PruebaGitSPlit\PruebaGitSPlit
docker compose up --build
```

URLs principales:

- Frontend: `http://localhost:5170`
- API Gateway: `http://localhost:8080`
- Health general: `http://localhost:8080/api/health`
- RabbitMQ Management: `http://localhost:15672`
- Usuario RabbitMQ: `guest`
- Clave RabbitMQ: `guest`

Para detener:

```powershell
docker compose down
```

Para reiniciar bases de datos:

```powershell
docker compose down -v
docker compose up --build
```

## Despliegue academico en nube

Para una entrega universitaria, la forma mas simple de desplegar es:

1. Desplegar `spliteasy-web` como frontend Docker o sitio estatico.
2. Desplegar `api-gateway` como servicio web Docker.
3. Desplegar cada microservicio como servicio web Docker.
4. Crear bases PostgreSQL separadas para Auth, User Group, Expense y Notification.
5. Usar Redis administrado para Debt Calculator.
6. Usar RabbitMQ administrado, por ejemplo CloudAMQP.
7. Usar MongoDB Atlas para el historial del agente IA.
8. Configurar en el gateway las URLs publicas o privadas de cada microservicio.

Variables obligatorias:

```env
JWT_SECRET=secreto-jwt-backend-split
COOKIE_SECRET=secreto-cookie-spliteasy
GATEWAY_SHARED_SECRET=secreto-interno-gateway-spliteasy
FRONTEND_ORIGIN=https://url-del-frontend
RABBITMQ_URL=amqp://usuario:clave@host/vhost
REDIS_URL=redis://host:6379/0
MONGO_URL=mongodb+srv://usuario:clave@cluster/ai_agent_db
```

El `Report Service` cumple el requisito serverless porque esta escrito con Functions Framework y puede ejecutarse como Cloud Function o contenedor serverless.
