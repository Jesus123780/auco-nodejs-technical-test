# Verificación realizada — AUCO Technical Test

**Fecha:** 18 de noviembre de 2026  
**Entorno donde se ejecutaron las comprobaciones:** macOS, Docker Compose, Node.js 22+ y dependencias npm instaladas.  
**Alcance:** entorno local; no se hizo despliegue público.

## 1. Resultados confirmados

| Comprobación | Resultado observado | Evidencia |
|---|---|---|
| Construcción de contenedor Node.js | Correcta | `docker compose up --build -d` construyó la imagen |
| MongoDB | Contenedor saludable | `docker compose ps -a` mostró `mongodb` healthy |
| DynamoDB Local | Contenedor iniciado | `docker compose ps -a` mostró `dynamodb` Up, puerto `127.0.0.1:8000` |
| API Node.js | Contenedor iniciado | `docker compose ps -a` mostró `api` Up, puerto `127.0.0.1:3000` |
| Health check | HTTP 200 | `GET /health` devolvió `{"status":"ok"}` |
| Pruebas unitarias y HTTP | **36 aprobadas en 4 archivos** | Salida de `npm test` con Vitest |
| Compilación TypeScript | Correcta | `npm run build` terminó sin errores |
| Smoke test de integración | **7 verificaciones exitosas** | Salida de `npm run smoke` |
| Evento de auditoría | Encontrado en DynamoDB Local | Último paso del smoke test, mediante consulta de la tabla |

**Nota:** se corrigió previamente un error de tipado `TS18046` en el manejador global de errores. La compilación posterior pasó. No se adjuntó una salida independiente de `npm run typecheck` posterior a ese ajuste, aunque `npm run build` compila el mismo proyecto TypeScript con `tsc`.

## 2. Pasos verificados por el smoke test

1. `GET /health` → HTTP 200.
2. `POST /validations` con datos inválidos → HTTP 400.
3. `POST /validations` con datos válidos → HTTP 201 e ID de MongoDB.
4. `GET /validations/:id` con ese ID → HTTP 200 y datos del país enriquecidos.
5. `GET /validations/:id` con ID mal formado → HTTP 400.
6. `GET /validations/:id` con ID inexistente → HTTP 404.
7. Consulta a DynamoDB Local → evento `VALIDATION_CREATED` encontrado para el ID creado.

**Salida final reportada:** `Todas las verificaciones de punta a punta finalizaron correctamente.`

La verificación E2E utiliza un documento **sintético** generado por el script (`TEST` + timestamp). La consulta a countries.dev envía el código del país, no el nombre ni el documento.

## 3. Ajuste de Docker Compose

En la primera ejecución apareció un conflicto de puerto: `Bind for 0.0.0.0:27017 failed: port is already allocated`. Para solucionarlo se eliminó la publicación del puerto de MongoDB en el host.

Configuración de puertos comprobada:

- **API:** `127.0.0.1:3000` → contenedor `3000`.
- **DynamoDB Local:** `127.0.0.1:8000` → contenedor `8000`.
- **MongoDB:** puerto `27017` **solo en la red interna de Docker**, accesible como `mongodb:27017` por la API.

Después del cambio, los tres contenedores iniciaron y el smoke test pasó.

## 4. Alcance y límites de la validación

- **Comprobado con servicios reales:** creación, consulta, enriquecimiento de país, guardado en MongoDB y auditoría en DynamoDB Local.
- **Comprobado con tests aislados o mocks:** manejo de errores, fallos de persistencia, compensación al fallar la auditoría y validaciones.
- **No demostrado como prueba real de infraestructura:** desconectar físicamente la API externa, detener MongoDB o DynamoDB durante operaciones, ni ejecutar pruebas de carga.
- **No consta ejecución de cobertura numérica:** `npm run test:coverage` puede utilizarse para generarla, pero no se reporta porcentaje sin salida real.
- **No se garantiza atomicidad distribuida** entre MongoDB y DynamoDB. Ante error de auditoría se intenta compensación; a futuro podría mejorarse mediante transactional outbox.
- **La API no verifica identidad de personas ni autenticidad documental.** El enriquecimiento corresponde a información pública del país.

## 5. Reproducir las pruebas

Desde la raíz del repositorio:

```bash
docker compose up --build -d
docker compose ps
curl -i http://127.0.0.1:3000/health
npm ci
npm run typecheck
npm test
npm run build
API_URL=http://127.0.0.1:3000 \
DYNAMODB_ENDPOINT=http://127.0.0.1:8000 \
npm run smoke
```

`npm ci` requiere que `package-lock.json` esté incluido en el repositorio. Para ver los logs: `docker compose logs --tail=100 api`.

**No usar `docker compose down -v` salvo que se quiera eliminar voluntariamente el contenido de los volúmenes.**
