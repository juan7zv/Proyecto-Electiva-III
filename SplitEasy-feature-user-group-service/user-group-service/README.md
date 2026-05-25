# User & Group Service - SplitEasy

Este microservicio en Go con GIN se encarga de guardar las relaciones de conectividad pública (perfiles, avatares), gestionar las agrupaciones (Groups) y asignar sus respectivos roles lógicos (`admin` vs `member`).

## Instrucciones y comandos útiles
1. Compilar y correr local: `go run main.go`
2. El framework por default escuchará en `localhost:8080` (O el port provisto en ENV).
3. **Pruebas:** Lanzar `go test ./tests/...` para probar las verificaciones estrictas de roles y denegación 403 Forbidden.
4. Para ejecutarlo independientemente con su propio motor Postgres: `docker-compose up -d`
5. Este microservicio depende imperativamente de un valor valido (JWT) en la cookie `access_token` despachado desde API/Auth Service para resolver quién eres.

> *NOTA TÉCNICA:* Las Base de Datos de Auth y este Servicio Usr/Grp se desacoplaron. Esto produce que Auth cree `users` y resuelva JWT's. Al logear, el usuario viaja sin saber nada más. Luego, la primera vez que interactúa acá, AuthID y UserGroup.Profiles.ID se emparejan a través de sus UUIDs. Con esto salvamos la carencia de FK (Claves Foráneas) a lo ancho del universo microservidor garantizando el patrón *Shared-Nothing DB* esperado de implementaciones Cloud nativas en Go.
