# Debt Calculator Service - SplitEasy

Este microservicio se ocupa del cómputo intensivo. Libera a la API de Gastos de realizar la minificación transaccional (El algoritmo Greedy de Deudas Óptimas).

## Asincronicidad y diseño
Cuando el broker de mensaje (`RabbitMQ`) recibe un nuevo gasto, notifica a los *Subscribers*. El Subscriber (en este caso emulado de forma directa por HTTP POST en nuestro test simulando el worker loop) inserta incrementalmente en el Hash Local de Redis los nuevos valores adeudados netos y lanza una computación general que vuelve y carga el Snapshot en Redis para que consumos Síncronos del API Gateway logren ver el resultado en O(1) tiempo de lectura.

## Requirements
Se necesita Redis instalado operativamente, o simplemente mediante nuestro bloque docker `docker-compose up -d`.

### Testing Unitario
Lanza `pytest tests/test_calculator.py` para visualizar mediante Python los distintos escenarios (reducción en cadena, A->B, etc).
