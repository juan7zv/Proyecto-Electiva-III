# Report Service - SplitEasy

Un componente *Serverless* real diseñado a medida con **Google Functions Framework**.
No guarda estado interactivo ni bases de datos propias. Cuando una Request golpea internamente su API, agrupa la información del `Expense Service` y `Debt Calculator`.

## Cold Starts y Render
Si es desplegado en Render (el cual simulará el contenedor y lo encenderá), la primera compilación tardará la imagen entera en despertar desde un estado Idle si no hubo consumo en 15 minutos (Naturaleza del *Cold Start*). Una vez vivo, devuelve los reportes JSON masivamente.

## Prueba y Ejecución
1. Correr local: `functions-framework --target=generate_report --port=8080 --debug`
2. Testeos: `pytest tests/test_report.py` (usa Mocks puristas de Requests Python).
