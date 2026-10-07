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
| 2026-10-07 | Viernes | Ventana 07:00–19:50 (manda DECISIONES sobre TB_HORARIOS 17:20). | Usuario (aceptó recomendación Fase 1) |
| 2026-10-07 | Sábado / domingo | Sábado 07:00–16:00; domingo no laborable. Editable por admin en `jornada_dia`. | Usuario (aceptó recomendación Fase 1) |
| 2026-10-07 | Mínimo igual al estándar | Se mantiene `duracion_laboral = max(minutos laborales, hora estándar)`. Se guarda también `minutos_laborales` sin mínimo. | Usuario (aceptó recomendación Fase 1) |
| 2026-10-07 | Paradas y sobretiempo | Las paradas NO se descuentan del sobretiempo; solo se informan. Se guarda `minutos_parada` en la producción. | Usuario (aceptó recomendación Fase 1) |
| 2026-10-07 | Duplicados | Se mantiene la regla código de bus + estación, comparando el **código de estación** (no el ID por línea), sin importar fecha ni línea. Retrabajo = supervisor anula y se registra de nuevo. | Usuario (aceptó recomendación Fase 1) |
| 2026-10-07 | Fecha de producción | Fecha del INICIO en America/Lima; no editable por el operario (sí por supervisor). | Usuario (aceptó recomendación Fase 1) |
| 2026-10-07 | Estación sin actividades | Se bloquea INICIAR: "Esta estación no tiene actividades configuradas. Avise a su supervisor." | Usuario (aceptó recomendación Fase 1) |
| 2026-10-07 | Minutos de actividades | Se importan tal cual (con decimales, `numeric(10,2)`); las de 100 min se reportan como provisionales. | Usuario (aceptó recomendación Fase 1) |
| 2026-10-07 | Login y roles | Código de operario + PIN 4–6 dígitos. Roles OPERARIO / SUPERVISOR / ADMIN. Operario ve indicadores de su línea; supervisor y admin, todo. | Usuario (aceptó recomendación Fase 1) |
| 2026-10-07 | Cronómetros simultáneos | Se permiten varios trabajos en curso por estación/operario. | Usuario (aceptó recomendación Fase 1) |
| 2026-10-07 | Detalles de parada | Se usa el catálogo de ejemplo del prompt (marcado como ejemplo); sin código de pieza por ahora. | Usuario (aceptó recomendación Fase 1) |
| 2026-10-07 | Catálogo de motivos | Un solo catálogo `motivo` con `tipo` (TIEMPO / PRODUCCION / AMBOS); se importan los 18 motivos como AMBOS, sin el placeholder. | Usuario (aceptó recomendación Fase 1) |
| 2026-10-07 | Infraestructura | Docker (app + PostgreSQL); PWA solo con conexión; exportación .xlsx con columnas originales. Destino de hosting aún sin definir. | Usuario (aceptó recomendación Fase 1) |
| 2026-10-07 | TB_MOVIMIENTO | No se implementa. | Usuario (aceptó recomendación Fase 1) |
| 2026-10-07 | Colores | Sin verde: INICIAR en azul; "Agregar motivo" en azul secundario. | Usuario (aceptó recomendación Fase 1) |
| 2026-10-07 | Snapshot de jornada | Cada producción guarda copia de la jornada usada para calcular, para que cambios futuros no alteren el histórico. | Usuario (aceptó recomendación Fase 1) |
| 2026-10-07 | Correcciones al original | Se corrigen: texto "Valor de tiempo" (redondear antes de separar h/min) y el toast de incidencias se muestra después de guardar. | Usuario (aceptó recomendación Fase 1) |
