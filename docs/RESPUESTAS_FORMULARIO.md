# Tres respuestas para el formulario de AUCO

> BORRADOR. Ajusta la primera respuesta DESPUÉS de ejecutar el proyecto y revisar personalmente el código. No afirmes haber corregido o probado algo que todavía no verificaste.

## 1. ¿Cómo usaste la IA, qué le pediste y qué tuviste que corregir?

Utilicé ChatGPT para apoyar el diseño de una arquitectura hexagonal sencilla para Node.js y TypeScript, generar una primera implementación de los adaptadores de Fastify, MongoDB, DynamoDB Local y de la API pública, y proponer escenarios de pruebas automatizadas. Pedí específicamente que el servicio no dependiera de credenciales reales de AWS y que fuera reproducible con Docker Compose. Un punto que necesité revisar fue el flujo de errores: guardar en MongoDB y fallar al escribir la auditoría podía dejar un registro incompleto. Por eso se incluyó una compensación que intenta revertir la escritura y responde con error, y se documentó que no reemplaza una transacción distribuida. También prioricé validación estricta de entrada y respuestas sin detalles internos de infraestructura. **[Antes de enviar: describe brevemente qué verificaste o modificaste tú al probarlo.]**

## 2. ¿Por qué elegiste las llaves de DynamoDB?

Elegí `document` como partition key porque la consulta natural de auditoría es recuperar todos los eventos asociados a un número de documento. Elegí `eventAt` como sort key porque permite mantener el historial en orden temporal y consultar periodos de tiempo de forma eficiente dentro de cada documento. La llave combina una fecha UTC en formato ISO 8601 y el identificador de validación, para evitar colisiones cuando ocurren dos operaciones en el mismo instante. El evento incluye `validationId`, `action` y `createdAt` para relacionarlo con MongoDB y facilitar trazabilidad.

## 3. ¿Qué mejorarías con más tiempo?

Implementaría un patrón transactional outbox en MongoDB, con un proceso independiente que publicara a DynamoDB de forma reintentable e idempotente; de esa forma se reduciría el riesgo de inconsistencias entre ambas bases. Además incorporaría pruebas de integración y de carga en CI, trazas y métricas, autenticación y autorización, protección y retención de documentos personales, rate limiting, una estrategia de idempotencia para solicitudes repetidas y un control más robusto de errores y reintentos con la API externa.
