# Checklist de entrega — AUCO Technical Test

## Verificaciones técnicas

- [ ] Se incluyó `package-lock.json` en el repositorio (y `node_modules/`, `dist/` y `.env` están ignorados).
- [ ] `docker compose up --build -d` inicia API, MongoDB y DynamoDB Local sin colisiones de puertos.
- [ ] `docker compose ps` muestra MongoDB healthy y API en ejecución.
- [ ] `curl -i http://127.0.0.1:3000/health` devuelve HTTP 200 y `{"status":"ok"}`.
- [ ] `npm ci` instala dependencias reproduciblemente desde el lockfile.
- [ ] `npm run typecheck` termina sin errores.
- [ ] `npm test` termina con las pruebas aprobadas (se observaron 36 en 4 archivos el 18/11/2026).
- [ ] `npm run build` finaliza correctamente.
- [ ] `npm run smoke` confirma los 7 pasos, incluida la auditoría real en DynamoDB Local.

## Documentación

- [ ] `README.md` explica el modo Docker y aclara que MongoDB **no publica** el puerto `27017` al host.
- [ ] `docs/VERIFICACION_REALIZADA.md` conserva resultados reales, sin atribuir resultados no ejecutados.
- [ ] `docs/DECISIONES_TECNICAS.md` explica llaves de DynamoDB y limitación de consistencia entre motores.
- [ ] `docs/RESPUESTAS_FORMULARIO.md` se adaptó para explicar el uso real de IA, los cambios corregidos personalmente y las mejoras futuras.
- [ ] Los ejemplos HTTP, OpenAPI y Postman coinciden con los endpoints reales.

## Publicación y entrega

- [ ] Se subió el proyecto a GitHub sin `.env`, credenciales reales ni datos personales usados como pruebas.
- [ ] El evaluador puede clonar el repositorio y ejecutar `docker compose up --build -d`.
- [ ] Se verificó acceso al repositorio (público o con los permisos acordados).
- [ ] Se entregó el enlace y las tres respuestas por https://forms.gle/Chjg4E3fDUsafgnS8 antes del **sábado 21 de noviembre de 2026 a las 12:00 del mediodía (hora Colombia)**.

**Importante:** no se exige un despliegue público. El éxito del smoke local no elimina la necesidad de dejar el repositorio reproducible para los evaluadores.
