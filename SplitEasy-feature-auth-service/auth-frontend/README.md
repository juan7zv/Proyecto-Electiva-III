# SplitEasy Auth - Frontend de Validación

Este es el frontend premium diseñado para validar el funcionamiento del **Auth Service** de SplitEasy. Implementa un sistema de autenticación moderno con un diseño oscuro elegante, efectos de vidrio (glassmorphism) y animaciones fluidas.

## Requisitos Previos

- **Node.js**: Versión 18 o superior.
- **Backend**: El microservicio `auth-service` debe estar configurado y corriendo (o listo para correr con su base de datos Postgres).

## Cómo ejecutar la validación

Para probar el sistema completo, sigue estos pasos:

### 1. Iniciar el Backend (auth-service)
1. Navega a `c:\SplitEasy\SplitEasy\auth-service`.
2. Asegúrate de tener una base de datos PostgreSQL disponible (puedes usar el `docker-compose.yml` incluido).
3. Configura tu `.env` con la `DATABASE_URL` y secretos.
4. Ejecuta `npm install` y luego `npm run dev`. El servidor debería iniciar en el puerto **3001**.

### 2. Iniciar el Frontend (auth-frontend)
1. Navega a `c:\SplitEasy\SplitEasy\auth-frontend`.
2. Ejecuta `npm install` (si no se ha hecho).
3. Ejecuta `npm run dev`. La aplicación se abrirá en el puerto **5173**.

## Características de la Validación

- **Registro y Login**: Formularios validados con feedback en tiempo real mediante notificaciones (Toasts).
- **Seguridad HttpOnly**: Las fichas (JWT y Refresh Tokens) se manejan exclusivamente mediante cookies, aumentando la seguridad contra XSS.
- **Dashboard de Control**:
    - **GET /auth/me**: Botón para validar si el Access Token es válido y obtener los datos del perfil.
    - **POST /auth/refresh**: Botón para forzar la renovación del Access Token usando el Refresh Token de la base de datos.
    - **POST /auth/logout**: Cierra la sesión, revoca el token en la BD y limpia las cookies.
- **Log de Respuestas**: Panel lateral que muestra en tiempo real las respuestas JSON crudas del servidor para depuración técnica.

---
*Desarrollado para la validación del Parcial 2 - SplitEasy.*
