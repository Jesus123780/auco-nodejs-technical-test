# Matriz de escenarios y verificación

| Escenario | Resultado esperado | Cobertura |
|---|---|---|
| POST válido con countryCode | 201 + id; Mongo y auditoría | HTTP + caso de uso + smoke real |
| POST válido sin countryCode | Se utiliza CO | HTTP |
| Espacios alrededor de name / countryCode minúsculas | Normaliza | HTTP |
| Nombre vacío, faltante, demasiado corto o de tipo incorrecto | 400 | HTTP (casos relevantes) |
| Documento inválido | 400 | HTTP |
| countryCode inválido | 400 | HTTP |
| Propiedades adicionales | 400 | HTTP |
| JSON inválido | 400 | HTTP |
| País inexistente en proveedor | 422 | Unit gateway |
| Error 429, 500 o 503 del proveedor | 502 | Unit gateway |
| Error de red del proveedor | 502 | Unit gateway |
| Timeout proveedor | 504 | Unit gateway |
| JSON inesperado del proveedor | 502 | Unit gateway |
| Proveedor falla → no escribe nada | Sin persistencia | Unit caso de uso |
| Mongo falla al escribir | 503, sin auditoría | Unit caso de uso |
| Dynamo falla tras guardado | 503 + intento de rollback | Unit caso de uso |
| Dynamo y rollback fallan | 503 de inconsistencia | Unit caso de uso |
| Mismo documento en dos solicitudes | Dos eventos, sort key diferente | Unit caso de uso |
| GET con ID válido existente | 200 y datos enriquecidos | HTTP + caso de uso + smoke |
| GET con ID inválido | 400 | HTTP + smoke |
| GET con ID no existente | 404 | HTTP + caso de uso + smoke |
| Mongo falla al consultar | 503 | Unit caso de uso |
| Error inesperado de programación | 500 sin filtrar secretos | HTTP |
| Ruta desconocida | 404 | HTTP |
| Auditoría real creada en DynamoDB Local | Evento presente y ligado al ID de Mongo | Smoke real |

## Límites intencionales

No se implementa autenticación, autorización, rate limiting, outbox transaccional, colas ni despliegue público: no se exigen en la prueba. Hay comentarios y documentación para incorporarlos antes de uso real. Las pruebas HTTP y unitarias usan mocks; ejecuta `npm run smoke` para comprobar las integraciones de verdad.
