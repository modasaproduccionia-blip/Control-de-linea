# FASE 1 — Análisis (CONTROL DE LÍNEA)

Fecha: 2026-10-07. Fuentes revisadas: `docs/PROMPT_MAESTRO.md`, `docs/DECISIONES.md`, `docs/INGENIERIA_INVERSA.md`, `docs/FORMULAS_ORIGINALES.md`, `docs/prototipo_control_de_linea.html` y `referencia/REGISTRO_CL0510.xlsx` (analizado con openpyxl, no solo con lo que dice la documentación).

No se escribió código de la aplicación en esta fase.

---

## a) Qué se va a construir (resumen)

1. App web Next.js + TypeScript + PostgreSQL/Prisma que reemplaza la app Power Apps + Excel Online de la Línea de Acabados.
2. El operario elige Cliente → Modelo → Línea → Estación → Nº de bus (3 dígitos) y obtiene el código de bus (`sigla + número`) y el responsable.
3. INICIAR / FINALIZAR con dos toques; las horas las pone el servidor y el contador sobrevive a recargas y cambios de tablet.
4. El contador cuenta solo tiempo laboral (07:00–19:50, sin almuerzo 11:40–12:25), y los días intermedios cuentan completos.
5. Durante el trabajo se registran paradas (PIEZA / MATERIAL) con inicio y fin; no detienen el contador del bus.
6. Al finalizar se calcula sobretiempo contra la hora estándar de la línea (L1 360 min, L2 270 min) y si cumple o no.
7. Checklist de actividades estándar → avance ponderado por minutos y minutos no cumplidos (mismas fórmulas y redondeo que Power Apps).
8. Si hay sobretiempo: motivos con % que suman 100. Si hay minutos no cumplidos: causas ordenadas con peso decreciente.
9. Máquina de estados en el backend (EN_PROCESO → … → COMPLETADO / ANULADO), transacciones, idempotencia y "trabajos en curso" para retomar.
10. Panel de indicadores con filtros cruzados, importador del Excel con `--dry-run` que reporta inconsistencias y diseño blanco/plomo MODASA para tablet.

---

## b) Conflictos y contradicciones encontrados

### b.1 Entre documentos (prompt, decisiones, Excel, fórmulas, prototipo)

| # | Conflicto | Dónde | Propuesta |
|---|---|---|---|
| 1 | **Viernes**: TB_HORARIOS dice 07:00–17:20; DECISIONES dice ventana 07:00–19:50 (sin distinguir día). | Excel vs DECISIONES | Manda DECISIONES → viernes 19:50. Confirmar. |
| 2 | **Sábado**: DECISIONES dice "07:00–19:50" sin excepción de día; el prompt, TB_HORARIOS, la fórmula original y el prototipo usan 07:00–16:00. El caso de prueba obligatorio "Sáb 14:00 → Lun 09:00 = 240" **solo da 240 con 16:00**. | DECISIONES vs prompt §5.3 | Usar 16:00 (como el prototipo) hasta confirmar. |
| 3 | **Almuerzo**: TB_PAUSAS dice Refrigerio 11:15–12:00; el usuario dijo 11:40–12:25. | Excel vs DECISIONES | Manda DECISIONES (11:40–12:25). Ya resuelto en el prompt. |
| 4 | **Botón INICIAR "verde"** (§4.3) y "Agregar motivo (verde)" (§4.6) contradicen "No usar verde; azul = acción" (§4). | Prompt interno | INICIAR azul, "Agregar motivo" azul secundario. |
| 5 | **Motivos**: el prompt dice "19 motivos + placeholder"; el Excel tiene **19 filas en total = 18 motivos reales + placeholder**. | Prompt §8 vs Excel | Importar 18. |
| 6 | **Actividades a 100 min**: el prompt dice que las 550 son "todas las de 360F, APOLO X, TUDFG, TUVWG". En realidad esas suman 452; **las otras 98 son de ZEUS5**. | Prompt §8 vs Excel | Reportarlo así en el importador. |
| 7 | **Minutos decimales**: el esquema define `actividad_estandar.minutos int`, pero 16 actividades de ZEUS5 tienen decimales (14.4, 28.2, 230.4, 1200.6…) y una tiene 102.00000000000001. | Prompt §8 vs Excel | Usar `numeric(10,2)` (y en snapshots). Redondear a int cambiaría el avance. |
| 8 | **Duplicado bus + estación "sin importar línea"**: en el original se compara el *texto* de la estación, y E21…E28 y "MF PAQUETERA" existen en L1 **y** L2. En el modelo nuevo `estacion` es por línea, así que el índice `(codigo_bus, estacion_id)` permitiría CM123 en L1/E21 y en L2/E21. | Prompt §5.10 vs §8 | En la práctica no ocurre (cada modelo está en una sola línea), pero para respetar la regla: índice sobre `(codigo_bus, estacion_codigo)`. Confirmar. |
| 9 | **Filtro de estación por línea** (`DIFERENCIA vs original`): hoy cada modelo pertenece a una sola línea (ZEUS5 y 360F → L2; APOLO X, TUDFG, TUVWG → L1), así que filtrar también por línea **no cambia nada** con los datos actuales. | Prompt §4.3 vs Excel | Implementarlo; diferencia sin impacto hoy. |
| 10 | **Nombre de estado**: el prototipo usa `PENDIENTE_TIEMPO`; el prompt usa `PENDIENTE_INCIDENCIAS_TIEMPO`. | Prototipo vs prompt §6 | Usar el del prompt. |
| 11 | **"Marcar todo"** en actividades: existe en el prototipo y no en el prompt. | Prototipo vs prompt | Es [MEJORA PROPUESTA]: ¿se incluye? (Riesgo: marcar todo sin revisar.) |
| 12 | **Ubicación del prototipo**: §11 lo pone en `referencia/`; las instrucciones y CLAUDE.md, en `docs/`. | Prompt §11 vs CLAUDE.md | Queda en `docs/` (ya está así). |
| 13 | **Texto "Valor de tiempo = X h Y min"**: el original usa `Int(min/60)` para horas y `Mod(Round(min),60)` para minutos; con 59,6 min muestra "0 h 0 min". | Fórmulas originales | Corregir (redondear primero, luego dividir) y marcar `DIFERENCIA vs original`. |
| 14 | **Toast tras incidencias**: el original muestra "Registro enviado" **antes** de guardar (si falla el guardado igual dijo éxito). | Fórmulas originales | Mostrar el toast después de que el servidor confirme. |
| 15 | **Detalles de parada de ejemplo** repiten textos de TB_MOTIVOS (Falta de asientos, Falta de componente de fibra de vidrio, Falta de suministros…). | Prompt §5.12 vs Excel | Pregunta: ¿catálogo propio o derivar de motivos? |

### b.2 Hallazgos de datos (ingeniería de datos) que el importador debe reportar

- **Suma de minutos de actividades vs hora estándar**: la suma por estación es muchísimo mayor que el estándar de la línea. Ej.: ZEUS5/L2/E24 = **24 380 min** (406 h) contra 270 min de estándar; ZEUS5/E23 = 12 990; 360F/E26 = 4 400. El avance es un cociente, así que la fórmula no se rompe, pero **los "minutos estándar" no son minutos-reloj por bus** (¿son horas-hombre? ¿valores provisionales?). Afecta cómo se rotulan en pantalla.
- 550/671 actividades = exactamente 100 min (452 en 360F/APOLO X/TUDFG/TUVWG + 98 en ZEUS5).
- 5 actividades duplicadas en ZEUS5/L2/E26 y E27 (mismos minutos, 100) → importar una vez.
- 9 nombres de actividad con espacio al final (`'Sellar faro RHD '`, `'Instalar perfil de ventana '`…) → `trim`.
- Actividades huérfanas: ZEUS5/L2/**E20** (2) y APOLO X/**L2**/MF PAQUETERA (2) — esas combinaciones no existen en TB_ESTACIONES.
- Estaciones sin actividades: 360F/L2/E28 y **APOLO X/L1/MF PAQUETERA** (este segundo caso no estaba documentado; probablemente es el mismo dato que quedó cargado como L2).
- Estaciones sin responsable: L1/MF PAQUETERA, L2/MF PAQUETERA, L2/"1° - MF PAQUETERA", L2/"2° - MF PAQUETERA".
- En L2 conviven "MF PAQUETERA" (360F) y "1° - MF PAQUETERA"/"2° - MF PAQUETERA" (ZEUS5): son estaciones distintas para la BD.
- Motivo con tilde mal escrita: "Falta de materiales de pintura l**Í**quida".
- TB_MOVIMIENTO: 12 valores 4 H … 10 H (240–600 min), con espacios finales en algunos ("7 H "). Sin uso.
- El Excel no trae TB_PRODUCCION ni tablas transaccionales → no hay histórico que migrar ni forma de comprobar el posible desfase de 5 h ni el bug de `Realizada`.
- Clientes: 40, nombres y siglas únicas, todas de 2 letras (incluye "OTRO" → OP). Sin problemas.

---

## c) Preguntas pendientes (§17) priorizadas, con opción recomendada

**Bloquean la Fase 3–4 (reglas y BD):**

1. **Sábado y domingo** — Recomiendo: sábado 07:00–16:00, domingo nunca cuenta, todo editable en `jornada_dia`. (Viernes 19:50 según DECISIONES.)
2. **`duracion_laboral = max(real, estándar)`** — Recomiendo: **mantenerlo** como en el original (es lo que alimenta los reportes actuales), pero guardar también `minutos_laborales_sin_minimo` para analizar. Efecto: un bus terminado en 60 min con 50 % de avance da 135 min no cumplidos (no 30).
3. **¿Paradas descuentan sobretiempo?** — Recomiendo: **no**, solo informar (como dice el prompt); guardar `minutos_parada` en la producción para poder cambiar la regla después sin migrar.
4. **Duplicados / retrabajo** — Recomiendo: mantener la regla bus + estación (código de estación, no ID), y que solo un supervisor pueda anular para re-registrar.
5. **Fecha de producción** — Recomiendo: la fecha del **INICIO** en America/Lima, no editable por el operario (editable por supervisor).
6. **Estación sin actividades** (360F/E28, APOLO X/L1/MF PAQUETERA) — Recomiendo: **bloquear INICIAR** con "Esta estación no tiene actividades configuradas. Avise a su supervisor." Así no se generan registros con 100 % no cumplido.
7. **Minutos de actividades (100 min y sumas enormes)** — Recomiendo: importar tal cual, marcados como provisionales en el reporte del importador, y pedir al área de ingeniería los valores reales.

**Bloquean la Fase 4–5 (auth, UI):**

8. **Login y roles** — Recomiendo: código de operario + PIN (4–6 dígitos); roles OPERARIO / SUPERVISOR / ADMIN; operario ve indicadores de su línea, supervisor y admin ven todo.
9. **Cronómetros simultáneos** — Recomiendo: **sí** permitirlos (varios buses por estación), listados en "Trabajos en curso".
10. **Catálogo real de detalles de parada; ¿código de pieza?** — Recomiendo: usar el ejemplo del prompt marcado como `es_ejemplo`, sin código SAP por ahora, campo opcional `codigo_pieza` deshabilitado.
11. **Separar motivos de sobretiempo y causas** — Recomiendo: un catálogo con `tipo` (todos `AMBOS` al importar), como dice el prompt.

**No bloquean hasta la Fase 10:**

12. **Hosting, Wi-Fi y Power BI** — Recomiendo: Docker (app + Postgres) en un servidor de la empresa o Azure; PWA solo-en-línea; exportación .xlsx con las columnas originales para Power BI.
13. **TB_MOVIMIENTO** — Recomiendo: no implementarlo (parece la lista antigua para elegir la hora estándar).

**Nuevas (surgen del análisis de datos):**

14. ¿Qué representan los minutos de las actividades si su suma por estación es 10–90 veces la hora estándar? ¿En pantalla se muestran como "minutos estándar" o como "peso"?
15. ¿Se incluye el botón "Marcar todo" del prototipo?
16. Si el admin cambia la jornada, ¿se recalculan registros históricos al corregirlos? Recomiendo guardar una copia (snapshot) de la jornada usada en cada producción.

---

## d) Riesgos técnicos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Redondeo en JS (`Math.round` es "half up" y hay errores de coma flotante: 1.005, 102.00000000000001) | Diferencias de ±1 con el original | `roundHalfAwayFromZero` con corrección por épsilon/escalado entero y pruebas con valores límite. |
| La función de minutos laborales debe dar el mismo resultado en cliente (contador en vivo) y servidor | El operario ve un tiempo y se guarda otro | Una sola función pura en `src/domain/` usada por ambos; el servidor recalcula y envía `serverNow`. |
| Zona horaria: servidor en UTC, reglas en hora de Lima | Cortes 07:00/19:50 desplazados 5 h | `@date-fns/tz` siempre con `America/Lima`, `timestamptz` en BD, pruebas con el TZ del proceso cambiado. |
| Pruebas E2E que cruzan almuerzo y noche necesitan reloj simulado en servidor | Riesgo de que el reloj falso llegue a producción | Reloj inyectable solo si `NODE_ENV=test` y variable explícita; validado en `env.ts`. |
| Doble toque / dos tablets sobre el mismo trabajo | Registros duplicados o estados inconsistentes | `Idempotency-Key`, columna `version`, índices únicos parciales, transacciones. |
| Wi-Fi inestable en planta | Pérdida de toques de INICIO/FIN | El contador sigue desde `hora_inicio`; botones con reintento idempotente; aviso "Sin conexión". Offline real queda fuera de alcance. |
| Datos de catálogo inconsistentes (huérfanos, duplicados, minutos provisionales) | Avances poco fiables | Importador con `--dry-run` y reporte; no corregir en silencio. |
| Cambios de catálogo o jornada después de registrar | El histórico cambia | Snapshots en las tablas transaccionales. |
| Auth.js con credenciales solo admite sesión JWT (no sesión en BD) | No se pueden revocar sesiones al instante | JWT corto (12 h) + verificar `usuario.activo` en cada request. |
| Indicadores sobre muchos registros | Lentitud | Agregaciones en SQL con índices por fecha/línea/estación. |
| Continuidad con reportes existentes (posible Power BI sobre el Excel) | Reportes rotos al cambiar de sistema | Exportación con las mismas columnas que TB_PRODUCCION y tablas hijas. |
