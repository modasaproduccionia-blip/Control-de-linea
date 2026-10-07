# CLAUDE.md — CONTROL DE LÍNEA (Línea de Acabados, MODASA)

Reconstrucción como app web de una app Power Apps que registra el tiempo de trabajo de cada estación sobre cada bus, las actividades realizadas, las paradas de producción y los motivos de sobretiempo e incumplimiento.

## Lee siempre al iniciar una sesión
1. `docs/DECISIONES.md` — decisiones confirmadas (mandan sobre todo lo demás).
2. `docs/PROMPT_MAESTRO.md` — especificación completa (reglas, BD, API, fases).
3. Si tocas UI: `docs/prototipo_control_de_linea.html` es la referencia visual.
4. Si tocas una regla heredada: `docs/FORMULAS_ORIGINALES.md` (fórmulas originales) y `docs/INGENIERIA_INVERSA.md`.

## Reglas de trabajo
- Trabaja por fases y por tareas pequeñas. Antes de escribir código en una tarea no trivial, muestra un plan corto y espera mi OK.
- Nunca digas que algo funciona si no lo ejecutaste. Muestra el comando y el resultado real de las pruebas.
- Toda regla de negocio va en `src/domain/` como función pura con pruebas. Nada de lógica de negocio en componentes.
- Si una instrucción mía contradice una regla de `DECISIONES.md` o del prompt maestro, avísame del conflicto antes de cambiarla.
- No inventes datos de negocio (catálogos, minutos, horarios). Si falta, pregunta y deja `// TODO(confirmar):`.
- Cuando confirme una decisión nueva, agrégala a `docs/DECISIONES.md` en la misma tarea.
- Al terminar cada tarea: resumen de cambios, pruebas ejecutadas, pendientes, y propuesta de mensaje de commit.
- Textos de la interfaz en español, simples, pensados para operarios en tablet.

## Comandos del proyecto
Requisitos: Node 22 (`.nvmrc`), npm, Docker (para PostgreSQL).

| Acción | Comando |
|---|---|
| Instalar dependencias | `npm install` |
| Variables de entorno | `cp .env.example .env` y completar `AUTH_SECRET` |
| Levantar BD (solo PostgreSQL) | `docker compose up -d db` |
| Migrar | _(Fase 3)_ |
| Sembrar / importar Excel | _(Fase 3)_ |
| Desarrollo | `npm run dev` → http://localhost:3000 |
| Pruebas unitarias | `npm test` (`npm run test:watch` en modo observación) |
| E2E | _(Fase 7, Playwright)_ |
| Lint / formato / tipos | `npm run lint` · `npm run format:check` · `npm run typecheck` |
| Todo lo anterior junto | `npm run check` |
| Build de producción | `npm run build` |
| App + BD en contenedores | `docker compose up --build` |
| Salud del servicio | `GET /api/v1/health` → `{ status, serverNow }` |

## Diseño (resumen)
Blanco/plomo; azul MODASA #1E388F = acción/cumple; amarillo #FFD200 = paradas; rojo #D3141B = finalizar/sobretiempo/no cumple. Barlow / Barlow Condensed. Botones táctiles ≥ 56 px. Tablet primero.
