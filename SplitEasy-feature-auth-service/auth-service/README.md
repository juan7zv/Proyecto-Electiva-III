# Auth Service - SplitEasy

Este microservicio se encarga de todo el ciclo de autenticación y protección de sesiones utilizando JWT y Strings Aleatorios opacos mitigantes, almacenados inteligentemente en Cookies `HttpOnly`.

## Qué hace este servicio
Maneja los endpoints:
- POST `/auth/register`
- POST `/auth/login`
- POST `/auth/refresh`
- POST `/auth/logout`
- GET `/auth/me`

Otorga dos cookies en caso ideal: `access_token` (JWT de uso transitorio y recurrente) y `refresh_token` (Token de larga data renovador).

## Ejecución Local y Pruebas Unitarias
Requisitos: Node.JS 18+ instalado.
1. `npm install`
2. Copiar `.env.example` hacia un nuevo `.env` válido local.
3. Puedes hacer uso de nuestra estructura de docker integrada: `docker-compose up -d auth-db` levantará la Postgres en el 5432 local.
4. `npm run dev` levantará Fastify en el puerto default.
5. Para las pruebas: lanzar `npm test`. Usa inyección simulativa Jest sin levantar redes HTTP.

## Despliegue en Render
1. Crearemos en *Render Web Services* un nuevo recurso y enlazaremos la repo `https://github.com/Belpoo/SplitEasy` señalando el Root Directory de Render como `auth-service`.
2. Como Dockerfile dictamina un arranque normal, Render lo pre-procesará automáticamente. Asegúrate de añadir las **Variables de Entorno** desde la interfaz administrativa Dashboard.
3. Emplear un "Render Postgres" (creado en paralelo allí mismo en el dashboard gratuito de Render), y conectar su Internal Database URL como `DATABASE_URL` al entorno.

> *NOTA TÉCNICA RELEVANTE EXIGIDA: La naturaleza del Access Token significa que una apropiación indebida de él generaría peligro en el tiempo que demore expirarse puesto a su inmodificabilidad, de allí el por qué es tan corto de caducidad. Mientras el Refresh Token, más sensible, goza de su campo "revoked" interno de PostgreSQL de donde, al usuario pulsar en "Logout" a voluntad desactiva en BD cualquier reuso.*
