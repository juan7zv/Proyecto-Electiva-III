# Expense Service - SplitEasy

Este microservicio se dedica casi en totalidad al volumen monetario. Ingresa un Gasto total e inserta sus proporciones (Splits) individuales.
Cuenta con un rasgo fundamental: Es el Productor Original del Evento general de cálculo de Deuda en el Broker Asíncrono de RabbitMQ y Notification Manager.

## Ejecutar localmente
Típicamente requiere Go 1.20+:
1. `go run main.go`

## Asincronicidad Simulada y Ajustes
Se creó la función `PublishExpenseEvent` en `broker/rabbitmq.go`.
Si controlas su entorno en `.env` ajustando predefiniendo `USE_BROKER=false`, este publicará un Log verde claro de *"[BROKER SIMULADO] Evento expense.created"* a la consola emulando el delivery exitoso para no tumbar la pipeline durante evaluación simplificada.
Si ajustas `USE_BROKER=true` y un link valido de `RABBITMQ_URL`, hará pull HTTP en RabbitMQ/CloudAMQP real.

## TDD Test
Lanza `go test ./tests/...` para asegurar que divisiones desiguales trunca en HTTP 400.
