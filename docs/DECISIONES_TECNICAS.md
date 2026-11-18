# Decisiones técnicas y límites de la solución

## Arquitectura hexagonal pragmática

- **domain**: contratos para repositorios y modelos (`Validation`, `CountryInfo`, `AuditEvent`), sin dependencias de framework.
- **application**: `CreateValidationUseCase` y `GetValidationUseCase`, únicos responsables de coordinar el caso de uso.
- **infrastructure**: implementaciones de los puertos con Mongoose, AWS SDK y `fetch`.
- **interfaces/http**: adaptador de entrada con Fastify; valida, asigna HTTP y serializa respuestas.
- **main.ts**: composition root, inyección de dependencias y arranque ordenado.

Se prefiere esta estructura sobre microservicios: dos endpoints no justifican distribuir la lógica entre procesos.

## Elección de la API pública

`https://countries.dev/alpha/{countryCode}` no requiere token. Se envía únicamente `countryCode` (por defecto `CO`) para recuperar nombre del país, capital y código de moneda. **No se envía el nombre ni el documento del usuario**. Este enriquecimiento NO representa una validación oficial de identidad. Incluimos `countryCode` como propiedad opcional y lo documentamos expresamente, de modo que el contrato mínimo de AUCO (nombre + documento) sigue funcionando.

- Timeout configurable y sin reintentos automáticos para no alargar cada petición.
- 404 del país → `422 COUNTRY_NOT_FOUND`.
- Error HTTP del proveedor o error de red → `502 COUNTRY_API_UNAVAILABLE`.
- Timeout → `504 COUNTRY_API_TIMEOUT`.
- JSON inválido o inesperado → `502 COUNTRY_API_INVALID_RESPONSE`.
- En errores externos no se guarda ni audita.

## Llaves de DynamoDB

Tabla: `validation_audit`.

| Atributo | Llave | Tipo | Razón |
|---|---|---|---|
| `document` | Partition key (HASH) | String | Permite consultar todos los eventos asociados a un documento mediante `Query`, sin escaneo completo. |
| `eventAt` | Sort key (RANGE) | String | Ordena cronológicamente los eventos ISO UTC; añade `#validationId` para evitar colisiones de timestamp. |

Otros atributos: `validationId`, `action`, `createdAt`. El item solo se escribe con `ConditionExpression` que impide sobreescrituras accidentales. La tabla se crea automáticamente si no existe. Para el entorno local no hay cuenta AWS real; el SDK apunta a DynamoDB Local con credenciales simuladas.

### Revisión crítica

El uso de `document` como partition key es el requisito más natural para consultar su historial, pero puede producir **hot partitions** en aplicaciones con un volumen anormal de actividad para un mismo documento. También es un dato personal: en una solución productiva habría que analizar tokenización/HMAC determinístico en la llave, cifrado, retención y controles de acceso. En esta prueba local se conserva el documento para cumplir literalmente con la especificación.

## Manejo de fallos parciales (dos bases no transaccionales)

Orden de escritura: proveedor externo → MongoDB → DynamoDB. El endpoint **solo confirma `201` después del éxito de las dos escrituras**.

- Si falla el proveedor, no se escribe ninguna base.
- Si falla Mongo, no se intenta auditar y se responde `503`.
- Si falla Dynamo después de Mongo, se ejecuta una compensación `deleteById` en Mongo, y se responde `503 AUDIT_UNAVAILABLE`.
- Si también falla la compensación, se responde `503 PERSISTENCE_INCONSISTENT`. El evento puede faltar para un registro persistido: se requiere reconciliación manual. **No se afirma atomicidad distribuida**.
- El mecanismo de compensación tampoco soluciona ambigüedades de red: Dynamo podría haber escrito el evento aunque su respuesta se haya perdido. El caso queda documentado como límite deliberado.

**Mejora futura recomendada:** transactional outbox en MongoDB con réplica y transacciones, worker de publicación a DynamoDB, reintentos exponenciales, idempotencia del consumidor, reconciliación y métricas de atraso. La publicación event-driven también permitiría tolerar caída temporal de Dynamo sin perder el evento.

## Pruebas y datos

- Unitarias de casos de uso: orden de operaciones, error Mongo, error auditoría, compensación y lectura.
- Unitarias del cliente externo: 404, 429/5xx, timeout, red caída y formato inesperado.
- HTTP por inyección (`Fastify.inject`) sin bases ni Internet: códigos, validaciones, serialización, formato de error.
- Smoke E2E opcional contra los tres servicios reales (`npm run smoke`).

Se guardan nombres y documentos tal como se reciben; no se añade autenticación porque AUCO pidió un servicio mínimo local, **no porque sea adecuado exponerlo públicamente**. No desplegar sin autenticación, TLS, política de retención y medidas de protección de datos.
