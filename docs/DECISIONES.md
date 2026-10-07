# Registro de decisiones — CONTROL DE LÍNEA

Aquí se anota cada decisión de negocio confirmada por el usuario. Claude Code debe leer este archivo al empezar cada sesión y **agregar** una línea cada vez que el usuario confirme algo. Si una decisión contradice `docs/PROMPT_MAESTRO.md`, manda la de este archivo (es más reciente).

| Fecha | Tema | Decisión | Fuente |
|---|---|---|---|
| 2026-10-07 | Medición de tiempo | Dos toques INICIO/FIN por bus-estación; el contador se muestra en vivo. No se cronometra cada actividad. | Usuario |
| 2026-10-07 | Ventana laboral | Cuenta solo 07:00–19:50 (aunque el horario oficial es 07:00–17:20). Fuera de la ventana no cuenta; continúa al día siguiente. | Usuario |
| 2026-10-07 | Almuerzo | 11:40–12:25 no se cuenta. | Usuario |
| 2026-10-07 | Hora estándar | En minutos. L1 = 360, L2 = 270. | Excel |
| 2026-10-07 | Paradas | Se registran con inicio y fin; tipo PIEZA o MATERIAL. | Usuario |
| 2026-10-07 | Diseño | No copiar Power Apps. Blanco y plomo con colores MODASA; referencia: docs/prototipo_control_de_linea.html. | Usuario |
| 2026-10-07 | Indicadores | Panel interactivo con filtros y clic para filtrar. | Usuario |
