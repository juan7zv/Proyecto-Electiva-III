# Requisitos funcionales de SplitEasy

## Usuarios y autenticacion

- Un usuario puede registrarse con nombre, correo y contrasena.
- Un usuario puede iniciar sesion y cerrar sesion.
- La sesion usa `access_token` JWT y `refresh_token` en cookie `HttpOnly`.
- El sistema permite renovar la sesion usando el refresh token.

## Grupos y roles

- Un usuario autenticado puede crear grupos.
- El creador del grupo queda con rol `admin`.
- Un `admin` puede agregar miembros por UUID de usuario.
- Un `admin` puede remover miembros.
- Los miembros pueden consultar los grupos a los que pertenecen.

## Gastos compartidos

- Un usuario autenticado puede registrar un gasto en un grupo.
- El gasto debe incluir el monto total, descripcion y division por miembros.
- La suma de las divisiones debe coincidir con el total del gasto.
- Al crear un gasto se publica un evento asincronico `expense.created`.
- Quien registro un gasto puede eliminarlo.

## Calculo de deudas

- El Debt Calculator consume eventos de gastos desde RabbitMQ.
- El servicio recalcula balances netos por grupo.
- El servicio genera un plan de pagos optimizado para liquidar deudas.
- Los balances y planes se guardan en Redis para consulta rapida.

## Notificaciones

- El Notification Service consume eventos de gastos desde RabbitMQ.
- Cada participante del gasto recibe una notificacion.
- Un usuario puede listar sus notificaciones.
- Una notificacion puede marcarse como leida.

## Reportes

- El Report Service funciona como microservicio serverless con Functions Framework.
- Genera reportes por grupo consultando gastos, balances y deudas.
- No mantiene base de datos propia.

## Agente IA

- El agente responde preguntas sobre balances, deudas, gastos y resumenes del grupo.
- Consulta informacion real de Debt Calculator y Expense Service.
- Guarda historial de conversaciones en MongoDB cuando Mongo esta disponible.

## Frontend unificado

- El frontend principal esta en `spliteasy-web`.
- El usuario accede a todos los modulos desde una sola aplicacion.
- El frontend consume unicamente el API Gateway.
