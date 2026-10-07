# PROMPT MAESTRO PARA CLAUDE CODE

Estás trabajando en la reconstrucción de una aplicación existente llamada **CONTROL DE LÍNEA** (título en pantalla: "APP - LÍNEA DE ACABADOS"), hoy construida en Power Apps Canvas con Excel Online como base de datos. Debes reconstruirla desde cero como una **aplicación web moderna, responsive y orientada a tablet**, conservando su lógica de negocio y añadiendo tres requerimientos nuevos confirmados por el usuario: **cronómetro de INICIO/FIN con dos toques**, **registro de paradas de producción** (inicio/fin y tipo pieza o material) y **panel interactivo de indicadores**. El diseño NO debe copiar la app actual: debe ser una versión mejorada, en blanco y gris (plomo) con los colores de MODASA.

La aplicación actual es la **fuente de verdad** sobre la funcionalidad existente. Material de referencia: en `docs/FORMULAS_ORIGINALES.md` están las fórmulas originales depuradas y en `referencia/REGISTRO_CL0510.xlsx` el Excel real (catálogos); en `docs/` están `INGENIERIA_INVERSA.md`, `DECISIONES.md` (decisiones confirmadas, mandan sobre este prompt) y `prototipo_control_de_linea.html`, que es la **referencia visual y de interacción aprobada como punto de partida**. Léelos antes de empezar. Si encuentras una diferencia entre este prompt, las fórmulas y el documento, **detente y pregúntame** antes de cambiar una regla de negocio.

Etiquetas usadas: **[ORIGINAL]** = comportamiento actual que debes replicar. **[NUEVO]** = requerimiento nuevo confirmado por el usuario. **[MEJORA PROPUESTA]** = no implementar sin mi aprobación explícita. **[PENDIENTE]** = dato que debo confirmarte; usa el valor por defecto indicado, déjalo configurable y márcalo con `// TODO(confirmar):`.

---

## 1. Qué problema resuelve

En la Línea de Acabados (planta de fabricación de buses), cada **estación** trabaja sobre un **bus**. La app registra cuánto tiempo tomó ese trabajo, lo compara contra una **hora estándar por línea**, registra qué **actividades estándar** se completaron (cada una con sus minutos estándar) y, si hubo **sobretiempo** o **minutos no ejecutados**, obliga a registrar sus **motivos/causas** para generar indicadores.

## 2. Usuarios

- **Operario / líder de estación** [ORIGINAL]: registra trabajos, marca actividades, registra incidencias y causas. Uso principal en **tablet en planta**, posiblemente con guantes y poca luz → botones grandes.
- **Supervisor** [MEJORA PROPUESTA, necesaria al salir de Excel]: consulta registros, corrige horas, anula registros, exporta datos.
- **Administrador** [MEJORA PROPUESTA, necesaria al salir de Excel]: mantiene catálogos (hoy se editan a mano en Excel).
- Método de login: **[PENDIENTE]** — por defecto implementar código de operario + PIN de 4–6 dígitos (apto para tablets compartidas), con la capa de autenticación desacoplada para poder añadir Microsoft Entra ID después.

---

## 3. Flujo de usuario

### 3.1 Flujo original (referencia) [ORIGINAL]
Formulario (fecha, cliente, modelo, línea, estación, nº bus, hora inicio y hora fin digitadas) → REGISTRAR → checklist de actividades → si sobretiempo > 0: motivos de tiempo → si minutos no cumplidos > 0: causas → inicio.

### 3.2 Flujo nuevo con cronómetro [NUEVO]
```
Login
 → Inicio: "Trabajos en curso" (cronómetros activos) + botón NUEVO TRABAJO
 → Paso 1 – Selección: Cliente → Modelo → Línea → Estación → Nº de bus (3 dígitos)
            (se muestra el Código de bus resultante y el Responsable)
 → Botón INICIAR  ⇒ se valida duplicado y se crea la producción en estado EN_PROCESO con hora_inicio = hora del servidor
 → Paso 2 – Cronómetro en vivo (HH:MM:SS) que cuenta SOLO tiempo laboral (ver §5.3)
      ├─ Botón REGISTRAR PARADA → tipo (Pieza | Material) + detalle + comentario → INICIAR PARADA
      │     (el contador de la parada corre; botón TERMINAR PARADA) — ver §5.12
 → Botón FINALIZAR (deshabilitado mientras haya una parada abierta) (con confirmación) ⇒ hora_fin = hora del servidor; se calculan duraciones, sobretiempo y cumple
 → Paso 3 – Actividades (pantalla de datos): checklist con barra de avance en vivo
 → REGISTRAR ACTIVIDADES ⇒ se calcula avance y minutos no cumplidos
 → si sobretiempo > 0 → Paso 4 – Incidencias de tiempo
 → si minutos no cumplidos > 0 → Paso 5 – Causas de incumplimiento
 → Pantalla de cierre "Registro completado" con resumen → volver al inicio
```
Reglas del flujo nuevo:
- Las marcas de tiempo las pone **el servidor**, nunca el reloj del dispositivo.
- El cronómetro debe **sobrevivir** a recargar la página, cerrar la tablet, cambio de turno o cambio de dispositivo: el tiempo transcurrido se calcula como `ahora − hora_inicio` a partir del registro en BD.
- Cualquier registro que quedó en un estado intermedio aparece en "Trabajos en curso / pendientes" y se puede **retomar** en el paso que corresponde.
- [NUEVO, confirmado] "Que se mida por tiempo" significa: **dos toques (INICIO y FIN) y el contador lo va mostrando**. El tiempo se mide por **bus-estación completo**; no se cronometra cada actividad.
- [NUEVO, confirmado] Las interrupciones se registran como **paradas de producción** (§5.12), no como pausas del cronómetro: el contador del bus sigue corriendo y la parada queda registrada con su propio inicio y fin.
- Mientras corre, el contador se detiene visualmente fuera del horario laboral y en el almuerzo, mostrando el motivo ("Almuerzo 11:40–12:25: no se cuenta", "Fuera de horario: se reanuda a las 07:00"), y se reanuda solo.
- **[PENDIENTE]** ¿Varios cronómetros simultáneos por estación/operario? Por defecto **sí se permiten** (se listan todos en "Trabajos en curso").

---

## 4. Pantallas (diseño nuevo)

[NUEVO, confirmado] **No copiar el diseño actual.** Diseño mejorado en **blanco y plomo** con los **colores de MODASA** (tomados de los logos del .msapp). Usa el prototipo `prototipo_control_de_linea.html` como referencia visual; puedes refinarlo, no reinventarlo.

Tokens de diseño (definir como variables CSS / tema de Tailwind, con variante oscura):
- Fondo plomo `#E4E7EB`, superficie blanca `#FFFFFF`, superficie secundaria `#F2F4F6`, bordes `#D0D6DD`/`#B9C1CA`, texto `#1D232B`, texto secundario `#56616D`.
- Azul MODASA `#1E388F` = **trabajo / acción principal / cumple** (INICIAR, REGISTRAR, avance, "Sí cumple").
- Amarillo MODASA `#FFD200` (texto oscuro encima) = **paradas** (botón REGISTRAR PARADA, banda de parada activa, minutos en parada).
- Rojo MODASA `#D3141B` = **finalizar / sobretiempo / no cumple / eliminar**.
- No usar verde: el código de color es el tricolor de la marca.
- Tipografía: Barlow (texto) y Barlow Condensed (números grandes, títulos, cronómetro), cifras tabulares.
- Motivo gráfico: paralelogramos inclinados (−16°) como en el logo, usados en el indicador de pasos y en las etiquetas de estado. Solo ahí; el resto, sobrio.
- Iconos lucide. Sin degradados decorativos.

Reglas de UX para operarios (aplican a todas las pantallas):
- Objetivos táctiles de **mínimo 56 px** de alto; botones principales de 72–96 px y ancho completo en tablet/celular.
- Preferir **botones/chips grandes** en vez de dropdowns cuando el catálogo tenga ≤ 12 opciones; usar buscador con lista grande cuando haya más.
- Teclado numérico en pantalla para el nº de bus.
- Un paso por pantalla, con indicador de pasos (1 Selección · 2 Cronómetro · 3 Actividades · 4 Tiempo · 5 Causas).
- Confirmación (modal propio, no `window.confirm`) antes de cada acción que guarda, igual que la app original.
- Mensajes de error junto al campo y toasts de éxito/error con los **mismos textos** que la app original (ver §7).
- Botón "Atrás" solo donde no rompa la integridad (no se puede volver de Actividades a modificar la hora de fin; eso lo corrige un supervisor).

### 4.1 Login [PENDIENTE método]
### 4.2 Inicio – Trabajos en curso
Tarjetas grandes por cada producción no completada del usuario/estación: código de bus, modelo, línea, estación, estado y, si está EN_PROCESO, tiempo transcurrido en vivo. Tocar una tarjeta lleva al paso pendiente. Botón grande **NUEVO TRABAJO**.

### 4.3 Paso 1 – Selección de bus y estación [ORIGINAL + NUEVO]
Campos en este orden, cada uno filtrado por el anterior:
1. **Fecha de producción**: por defecto hoy en zona horaria `America/Lima` [PENDIENTE: confirmar si es la fecha de INICIO]. Editable.
2. **Cliente**: catálogo `cliente` (muestra el nombre).
3. **Modelo**: modelos distintos presentes en `modelo_linea_estacion`.
4. **Línea**: líneas distintas para ese modelo.
5. **Estación**: estaciones para ese modelo **y esa línea**. (La app original filtra estaciones solo por modelo; filtrar también por línea es una corrección → márcala en el código como `// DIFERENCIA vs original` y avísame en tu resumen de fase.)
6. **Nº de bus**: exactamente 3 dígitos (teclado numérico). Muestra en grande el **Código de bus = SiglaCliente + 3 dígitos** (ej. `CM` + `123` = `CM123`).
7. **Responsable**: solo lectura, se obtiene de `responsable_estacion` por línea + estación. Si no existe, mostrar "Sin responsable asignado" (no bloquear) [PENDIENTE].

Botón **INICIAR** (verde, enorme). Deshabilitado hasta que todos los campos sean válidos.

### 4.4 Paso 2 – Cronómetro [NUEVO]
- Banda azul con el **tiempo laboral contado** HH:MM:SS muy grande (legible a 2 m). Se vuelve gris con el mensaje correspondiente durante almuerzo o fuera de horario.
- Cabecera: código de bus grande, cliente · modelo · línea · estación, hora de inicio, responsable.
- Barra de progreso contra la hora estándar de la línea; se vuelve roja al superar el estándar y muestra "Sobretiempo: X h Y min" en vivo. Debajo, el tiempo real transcurrido (reloj de pared).
- Si hay parada activa: banda amarilla con tipo, detalle y su contador.
- Lista de paradas registradas del trabajo (tipo, detalle, hora inicio–fin, minutos laborales).
- Barra inferior: **REGISTRAR PARADA** (amarillo) y **FINALIZAR** (rojo). Con parada abierta solo se muestra **TERMINAR PARADA**.
- FINALIZAR pide confirmación con el código de bus y el tiempo laboral, calcula todo (§5) y pasa a Actividades.
- Modal de parada: dos botones grandes **Pieza** / **Material**, luego selector del detalle (catálogo según tipo) y comentario opcional; botón **INICIAR PARADA**.

### 4.5 Paso 3 – Actividades [ORIGINAL]
- Lista de `actividad_estandar` del modelo + línea + estación de la producción (comparación insensible a mayúsculas y espacios al importar datos; en BD por ID).
- Cada fila: casilla grande, nombre de la actividad, minutos estándar. Toda la fila es tocable.
- Pie con `Modelo - Línea - Estación` (ej. `ZEUS5 - L2 - E21`) y **barra de avance en vivo** (% ponderado por minutos) [MEJORA PROPUESTA mínima: la barra en vivo; si no la apruebo, mostrar solo el pie].
- Botón **REGISTRAR ACTIVIDADES** con confirmación "¿Confirmas el registro de actividades?".
- Se permite registrar con 0 actividades marcadas [ORIGINAL].
- Si la estación no tiene actividades configuradas: mostrar aviso y **preguntarme** qué hacer (en el original avance queda inválido y los minutos no cumplidos = duración laboral completa).

### 4.6 Paso 4 – Incidencias de tiempo [ORIGINAL]
Título "CONTROL DE INCIDENCIAS - TIEMPO". Arriba: `Sobretiempo total: {horas con hasta 2 decimales} hora ({minutos} min)`.
Lista editable de filas, empieza con 1 fila vacía. Cada fila: selector de motivo (catálogo `motivo`), selector de porcentaje 0–100 en pasos de 5, y texto "Valor de tiempo = X h Y min" = `% × sobretiempo`. Botones "Agregar motivo" (verde), "Eliminar motivo" (rojo, por fila) y **REGISTRAR**. Mostrar en vivo la suma de porcentajes (debe llegar a 100%).

### 4.7 Paso 5 – Causas de incumplimiento [ORIGINAL]
Título "CONTROL DE INCIDENCIAS PRODUCCIÓN". Texto: "Se dejaron de ejecutar {N} minutos de trabajo. ¿Cuáles fueron las principales causas?".
Lista editable ordenada; **la posición es el orden de importancia** (1 = más importante). Cada fila: selector de causa, botón + (agrega fila) y papelera (solo si hay más de 1 fila). Permitir reordenar (arrastrar o flechas ↑↓) [MEJORA PROPUESTA]. Mostrar en vivo el peso y minutos de impacto de cada fila [MEJORA PROPUESTA]. Botón **REGISTRAR**.

### 4.8 Cierre
"Registro completado" con resumen y botón grande "Nuevo trabajo".

### 4.9 Indicadores interactivos [NUEVO, confirmado]
Pestaña "Indicadores" accesible para todos los roles (operario ve su línea; supervisor ve todo [PENDIENTE confirmar alcance]). Todo filtrable y con clic para filtrar (cross-filter), como en el prototipo:
- Filtros: línea, modelo, estación, periodo (hoy, 7 días, 14 días, mes, rango libre), cliente.
- KPIs: nº de trabajos, % que cumplen tiempo, horas de sobretiempo, avance promedio, horas en paradas.
- Cumplimiento por estación (barras cumple / no cumple; clic = filtrar por estación).
- Paradas: reparto pieza vs material y top de detalles por minutos.
- Tendencia diaria de horas de sobretiempo y de parada.
- Pareto de motivos de sobretiempo y de causas de incumplimiento.
- Tabla de últimos registros con acceso al detalle.
- Actualización automática cada 60 s y trabajos en curso en vivo (opcional: vista "tablero de planta" a pantalla completa para TV [MEJORA PROPUESTA]).
- Endpoints de agregación en servidor (no calcular sobre miles de filas en el navegador).

### 4.10 Supervisor [MEJORA PROPUESTA]
Listado filtrable (fecha, línea, estación, bus, estado, cumple), detalle con actividades/incidencias/causas, corrección de hora inicio/fin con motivo (recalcula todo y deja auditoría), anular registro, exportar a Excel/CSV con las mismas columnas que las tablas originales (para no romper reportes existentes [PENDIENTE: ¿hay Power BI leyendo el Excel?]).

### 4.11 Administración de catálogos [MEJORA PROPUESTA, necesaria]
CRUD de clientes, modelos, líneas, estaciones, combinaciones modelo-línea-estación, actividades estándar (con minutos), responsables, hora estándar por línea, motivos, **detalles de parada (pieza/material)**, jornada laboral y almuerzo, y usuarios. Desactivar en vez de borrar si el registro ya se usó.

---

## 5. Reglas de negocio [ORIGINAL salvo indicación]

Implementa toda esta lógica como **funciones puras** en `src/domain/` con pruebas unitarias. Ninguna regla de negocio en componentes de UI. El servidor siempre recalcula; nunca confíes en valores calculados enviados por el cliente.

Redondeo: Power Fx `Round` redondea "half away from zero". Implementa `roundHalfAwayFromZero(valor, decimales)` y úsalo en todos los cálculos.

### 5.1 Código de bus
`codigoBus = cliente.sigla + numeroBus` (numeroBus = 3 dígitos, `^\d{3}$`).

### 5.2 Duración real
`duracionRealMin = minutos(horaFin − horaInicio)`; 0 si falta alguna.

### 5.3 Duración laboral (calcularMinutosLaborales) [NUEVO, confirmado — reemplaza la fórmula original]
El usuario redefinió la regla. Solo se cuenta el tiempo que cae **dentro de la ventana laboral de cada día**, descontando el **almuerzo**; todo lo demás no se cuenta, aunque el trabajo siga.

Trabajar en hora local `America/Lima`. Para cada día calendario entre `inicio` y `fin`:
1. Si el día no es laborable → 0.
2. `tramo = intersección([inicio, fin], [día ENTRADA, día SALIDA])`.
3. `minutos += duración(tramo) − intersección(tramo, [día ALMUERZO_INICIO, día ALMUERZO_FIN])`.

Configuración por defecto (tabla `jornada_config`, editable por admin, una fila por día de la semana + almuerzo):
- Lunes a viernes: 07:00 – 19:50. (El horario oficial es 07:00–17:20, pero casi siempre se trabaja hasta 19:50 y el usuario confirmó que **todo hasta 19:50 cuenta** sin distinción.)
- Sábado: 07:00 – 16:00 [PENDIENTE: sale de TB_HORARIOS y de la fórmula original; el usuario solo mencionó 07:00–19:50].
- Domingo: no laborable [PENDIENTE confirmar].
- Almuerzo: 11:40 – 12:25 todos los días laborables (45 min). [Conflicto: `TB_PAUSAS` dice Refrigerio 11:15–12:00; manda lo dicho por el usuario. Charla 07:00–07:20 y Lonche 19:00–19:15 de TB_PAUSAS **sí se cuentan** salvo que el usuario indique lo contrario.]
- Viernes: TB_HORARIOS dice 17:20; el usuario dijo 19:50 → usar 19:50 [confirmar en Fase 1].

Luego: `duracionLaboralMin = max(round(minutosLaborales), horaEstandarLinea)` [ORIGINAL — PENDIENTE confirmar si se mantiene el mínimo igual al estándar].

Casos de prueba obligatorios (configuración por defecto, sin aplicar el max):
- Mar 07:00 → Mar 19:50 = 725 (770 − 45 de almuerzo).
- Mar 11:00 → Mar 13:00 = 75.
- Mar 11:50 → Mar 12:10 = 0 (todo dentro del almuerzo).
- Mar 18:00 → Mié 08:00 = 110 + 60 = 170 (la noche no cuenta).
- Mar 19:00 → Mar 22:00 = 50 (después de 19:50 no cuenta).
- Sáb 14:00 → Lun 09:00 = 120 + 0 (domingo) + 120 = 240.
- Lun 10:00 → Mié 10:00 = 545 + 725 + 180 = 1450 (los días intermedios **sí** cuentan completos).
- Inicio 06:30 → 07:30 = 30 (antes de las 07:00 no cuenta).

### 5.4 Sobretiempo y cumplimiento
- `sobretiempoMin = max(duracionLaboralMin − horaEstandarLinea, 0)`.
- `cumpleTiempo = sobretiempoMin > 0 ? "NO" : "SI"` (guardar como booleano; exponer SI/NO en UI y exportes).
- `horaEstandarLinea` viene de `linea.hora_estandar_min`; se guarda una **copia** en la producción al iniciar (snapshot) para que cambios futuros del catálogo no alteren registros históricos.
- [CONFIRMADO por el Excel] HoraEstandar está en **minutos**: L1 = 360 (6 h), L2 = 270 (4,5 h). La captura original (07:00→20:00 = 780 − 270 = 510 min de sobretiempo) lo corrobora.
- [PENDIENTE] ¿Los minutos de parada se descuentan antes de calcular el sobretiempo? Por defecto **no** (sobretiempo sobre el tiempo laboral total, como hoy) y las paradas se informan aparte; en la pantalla de motivos de sobretiempo se muestra "Este bus tuvo X min en paradas".
- Si la línea no tiene hora estándar configurada: bloquear INICIAR con el mensaje "La línea no tiene hora estándar configurada. Avise a su supervisor." (el original no lo validaba; marca `// DIFERENCIA vs original`).

### 5.5 Avance
`avancePct = roundHAZ( Σ minutos marcados / Σ minutos de todas las actividades × 100, 1)`. Si no hay actividades → ver §4.5 (preguntar).

### 5.6 Minutos no cumplidos
`pctRedondeado = roundHAZ( max(Σ marcados, 0) / max(Σ total, 1) × 100, 1)`
`minutosNoCumplidos = roundHAZ( duracionLaboralMin × (100 − pctRedondeado) / 100, 0)`.

### 5.7 Navegación tras actividades
1. `sobretiempoMin > 0` → Incidencias de tiempo (y luego causas si `minutosNoCumplidos > 0`).
2. Si no, `minutosNoCumplidos > 0` → Causas.
3. Si no → Completado.

### 5.8 Incidencias de tiempo
- Porcentajes en múltiplos de 5 (0–100). Suma exacta = 100.
- Sin motivos repetidos.
- [DIFERENCIA vs original, aprobada como corrección de datos] No permitir filas sin motivo ni con porcentaje 0 (el original permitía motivo vacío porque el placeholder "Seleccione motivo-------" era una fila del catálogo). Avísame en el resumen de fase.
- Por fila: `porcentaje` (entero), `tiempoImpactoMin = roundHAZ(porcentaje/100 × sobretiempoMin, 2)`.

### 5.9 Causas de incumplimiento
- Sin causas repetidas; mínimo 1; no aceptar fila vacía.
- Con N causas, la posición `s` (1..N) pesa `peso = (N − s + 1) / (N·(N+1)/2)`.
- `pesoAsignado = roundHAZ(peso × 100, 0)` (entero).
- `minutosImpacto = roundHAZ(minutosNoCumplidos × (pesoAsignado > 1 ? pesoAsignado/100 : peso), 0)`.
- Pruebas: N=1 → [100]; N=2 → [67, 33]; N=3 → [50, 33, 17]; N=4 → [40, 30, 20, 10]. Verifica que reproduces el redondeo del original aunque la suma de minutos no cuadre exacto (documéntalo).

### 5.10 Duplicados
No puede existir otra producción no anulada con el mismo **código de bus + estación** (sin importar fecha ni línea). Validar al pulsar **INICIAR** y reforzar con índice único parcial en BD (`WHERE estado <> 'ANULADO'`). Mensaje: "Este Código Bus ya fue registrado en esta estación." [PENDIENTE: confirmar si debe permitirse retrabajo].

### 5.11 Catálogo de motivos
El original usa **un solo catálogo** (`TB_MOTIVOS`) para motivos de tiempo y causas de producción. Modela `motivo` con un campo `tipo` (`TIEMPO`, `PRODUCCION`, `AMBOS`), siembra todos como `AMBOS` y **no** importes el placeholder "Seleccione motivo-------" como dato.

### 5.12 Paradas de producción [NUEVO, confirmado]
- Una parada pertenece a una producción EN_PROCESO; se registra con **inicio y fin** (dos toques, hora del servidor).
- Tipo obligatorio: **PIEZA** o **MATERIAL**. Detalle obligatorio desde catálogo `detalle_parada` filtrado por tipo (incluye "Otra pieza"/"Otro material" que exige comentario). Comentario opcional (máx. 300 caracteres).
- Solo **una parada abierta a la vez** por producción. No se puede FINALIZAR la producción con una parada abierta (mensaje: "Termina la parada antes de finalizar el trabajo").
- Duración de la parada: `duracionRealMin` (reloj de pared) y `duracionLaboralMin` con la **misma función de §5.3** (sin el max del estándar). Los indicadores usan la laboral.
- La parada no detiene el contador del bus.
- Catálogo inicial de detalles [EJEMPLO, el usuario debe validarlo]: Pieza → Falta de componente de fibra de vidrio, Falta de asientos, Falta de componentes de almacén, Pieza con defecto de calidad, Pieza no corresponde al modelo, Otra pieza. Material → Falta de materiales de pintura electrostática, Falta de materiales de pintura líquida, Falta de masilla / lijas, Falta de suministros, Falta de instalación de materiales, Otro material.
- [PENDIENTE] ¿Se debe registrar también la pieza/material exacto (código SAP, número de parte)? ¿Una parada debe notificar a almacén/supervisor?

---

## 6. Estados de la producción [NUEVO, derivado del flujo original]

```
EN_PROCESO ──FINALIZAR──► PENDIENTE_ACTIVIDADES ──REGISTRAR ACTIVIDADES──►
     ├─ sobretiempo>0 ─────────────► PENDIENTE_INCIDENCIAS_TIEMPO ──► (no cumplidos>0 ? PENDIENTE_CAUSAS : COMPLETADO)
     ├─ sobretiempo=0 y no cumplidos>0 ► PENDIENTE_CAUSAS ──► COMPLETADO
     └─ ambos = 0 ──────────────────► COMPLETADO
Cualquier estado ──(supervisor)──► ANULADO
```
Dentro de EN_PROCESO existe el sub-estado derivado "EN PARADA" (hay una `parada` con `fin` nulo); se muestra en la UI con etiqueta amarilla.
Las transiciones solo las ejecuta el backend, validando el estado actual (no se pueden registrar actividades dos veces, ni incidencias si no hay sobretiempo, etc.). Usa control de concurrencia optimista (`version`) para evitar dobles envíos desde dos tablets. Haz idempotentes INICIAR y FINALIZAR (doble toque = un solo efecto).

---

## 7. Validaciones y mensajes (conservar textos originales)

| Momento | Regla | Mensaje |
|---|---|---|
| INICIAR | Nº bus 3 dígitos | "Debe ingresar exactamente 3 dígitos. Ejemplo: 001" |
| INICIAR | Duplicado bus+estación | "Este Código Bus ya fue registrado en esta estación." |
| INICIAR | Todos los campos seleccionados y combinación modelo-línea-estación válida | "Complete todos los campos" |
| FINALIZAR | hora_fin > hora_inicio (garantizado por servidor) | — |
| FINALIZAR | No hay parada abierta | "Termina la parada antes de finalizar el trabajo" |
| INICIAR PARADA | Tipo y detalle elegidos; no hay otra parada abierta | "Elige si la parada es por pieza o por material" |
| Cualquier confirmación cancelada | — | "Registro cancelado" (información) |
| Actividades OK sin pendientes | — | "Registro enviado" (éxito) |
| Incidencias | Repetidos | "No se pueden registrar motivos repetidos" |
| Incidencias | Suma ≠ 100 | "Los porcentajes deben sumar 100%" |
| Causas | Repetidas | "No se pueden registrar causas repetidas" |
| Causas | Ninguna | "No hay causas para guardar" |
| Causas OK | — | "Registro guardado correctamente" |

La validación original "hora > 0" (que rechazaba horas 00:xx) era un efecto colateral de la digitación manual y **no aplica** con el cronómetro. Valida todo con Zod compartido entre frontend y backend; el backend es la autoridad.

---

## 8. Base de datos (PostgreSQL)

Origen: 13 tablas de Excel Online con todas las columnas como texto. Normaliza con IDs y FK, pero conserva **snapshots de texto** (nombre de actividad, minutos, hora estándar, responsable) en los registros transaccionales para que el histórico no cambie si cambia el catálogo.

Tablas (snake_case, `id` UUID, `created_at`, `updated_at`; campos de auditoría `created_by`/`updated_by` donde aplique):

- `cliente` (nombre único, sigla única, activo) ← TB_CLIENTE
- `modelo` (codigo único) ← TB_ESTACIONES.MODELO
- `linea` (codigo único, hora_estandar_min int) ← TB_PARAMETROS_LINEA
- `estacion` (codigo, linea_id) — único (codigo, linea_id) ← TB_ESTACIONES
- `modelo_linea_estacion` (modelo_id, linea_id, estacion_id) único ← TB_ESTACIONES
- `responsable_estacion` (linea_id, estacion_id, nombre) ← TB_RESPONSABLE
- `actividad_estandar` (modelo_id, linea_id, estacion_id, nombre, minutos int, orden int, activo) ← TB_ACTIVIDADES
- `motivo` (nombre único, tipo enum, activo) ← TB_MOTIVOS
- `jornada_dia` (dia_semana 1–7, laborable bool, entrada time, salida time) y `jornada_config` (almuerzo_inicio, almuerzo_fin) ← TB_HORARIOS (ajustado a lo confirmado en §5.3)
- `detalle_parada` (tipo enum PIEZA|MATERIAL, nombre, requiere_comentario bool, activo)
- `parada` (produccion_id FK, tipo, detalle_parada_id FK, detalle_nombre snapshot, comentario, hora_inicio timestamptz, hora_fin timestamptz null, duracion_real_min, duracion_laboral_min, registrado_por). Índice único parcial (produccion_id) WHERE hora_fin IS NULL → garantiza una sola parada abierta.
- `usuario` (codigo único, nombre, pin_hash, rol enum OPERARIO|SUPERVISOR|ADMIN, activo)
- `produccion` ← TB_PRODUCCION: fecha_produccion (date), cliente_id, modelo_id, linea_id, estacion_id, numero_bus (char 3), codigo_bus, responsable_nombre (snapshot), hora_inicio (timestamptz), hora_fin (timestamptz null), hora_estandar_min (snapshot), duracion_real_min, duracion_laboral_min, sobretiempo_min, cumple_tiempo (bool), avance_pct (numeric 5,1), minutos_no_cumplidos, estado (enum), iniciado_por, finalizado_por, version int. Índice único parcial (codigo_bus, estacion_id) WHERE estado <> 'ANULADO'. Índices por fecha_produccion, estado, (linea_id, estacion_id).
- `control_actividad` ← TB_CONTROL_ACTIVIDADES: produccion_id FK, actividad_estandar_id FK, actividad_nombre (snapshot), minutos (snapshot), realizada (bool). Único (produccion_id, actividad_estandar_id).
- `incidencia_tiempo` ← TB_INCIDENCIAS: produccion_id, motivo_id, motivo_nombre (snapshot), porcentaje int, tiempo_impacto_min numeric(10,2).
- `causa_incumplimiento` ← TB_CAUSAS_INCUMPLIMIENTO: produccion_id, motivo_id, motivo_nombre (snapshot), orden_importancia int, peso_asignado int, minutos_impacto int.
- `auditoria` (entidad, entidad_id, accion, antes jsonb, despues jsonb, usuario_id, fecha).

Columnas originales sin uso que **no** debes migrar a lógica: `AvanceFinalNuevo` (la app escribe `AvanceFinalNuevo2` → mapea a `avance_pct`), `Fecha` en control de actividades e incidencias. TB_HORARIOS se usa ahora como origen de `jornada_dia` (con los ajustes de §5.3). TB_PAUSAS: solo se toma el almuerzo, con el horario dicho por el usuario. TB_MOVIMIENTO (4 H … 10 H) sigue sin uso conocido → **no lo implementes**; pregúntame.

Las escrituras de cada paso (ej. actividades + actualización de producción + cambio de estado) van en **una transacción**.

Datos reales disponibles en `REGISTRO_CL0510.xlsx` (solo catálogos, sin registros de producción): 19 motivos + placeholder, 47 combinaciones modelo-línea-estación (modelos ZEUS5, 360F, APOLO X, TUDFG, TUVWG; líneas L1 y L2), 671 actividades, 40 clientes con sigla única, 17 responsables, horarios, pausas.
Problemas de datos que el importador debe **reportar** (no corregir en silencio):
- 550 de 671 actividades tienen exactamente 100 min (todas las de 360F, APOLO X, TUDFG, TUVWG): probablemente valor provisional → avisar.
- 5 actividades duplicadas en ZEUS5 L2 E26/E27 (mismo nombre dos veces). La app original las trataba como una sola al marcar (clave = nombre) → importar una sola vez y reportar.
- Actividades de `APOLO X / L2 / MF PAQUETERA`, pero en estaciones APOLO X solo existe en L1.
- Actividades de `ZEUS5 / L2 / E20`, pero E20 no existe en TB_ESTACIONES.
- `360F / L2 / E28` existe como estación pero no tiene actividades.
- No hay responsables para las estaciones MF PAQUETERA.
- El placeholder "Seleccione motivo-------" no se importa.

Incluye un script `scripts/import-excel.ts` que lea un .xlsx con las hojas/tablas originales, haga `trim`, deduplique catálogos sin distinguir mayúsculas y cargue la BD; con modo `--dry-run` que reporte inconsistencias. Los seeds de desarrollo se generan importando `REGISTRO_CL0510.xlsx`. Para indicadores de prueba genera producciones sintéticas marcadas `es_demo = true` (nunca mezclarlas con datos reales en producción).

---

## 9. Arquitectura y tecnologías

Elegidas por mantenibilidad con Claude Code, un solo lenguaje de punta a punta y despliegue simple:

- **Monorepo único con Next.js (App Router) + TypeScript estricto**: frontend y API en un solo despliegue.
- **PostgreSQL** + **Prisma** (migraciones versionadas, tipos generados).
- **Zod** para validación compartida cliente/servidor.
- **TanStack Query** en el cliente para datos de servidor, reintentos y refetch del estado del cronómetro; estado local de formularios con React Hook Form.
- **Tailwind CSS + shadcn/ui** (componentes accesibles, fáciles de modificar), con los tokens de §4.
- **Recharts** para los gráficos del panel de indicadores (o SVG propio si el gráfico es simple, como en el prototipo).
- **Auth.js** (credenciales código+PIN; preparado para Microsoft Entra ID) con sesiones en cookie httpOnly.
- **date-fns + @date-fns/tz** para todo el manejo de fechas en `America/Lima`; en BD siempre `timestamptz` (UTC).
- **pino** para logs estructurados (JSON) con `requestId`.
- **Vitest** (unitarias de dominio y servicios) + **Playwright** (E2E en viewport tablet y celular).
- **PWA** instalable en tablet (manifest + service worker solo para shell; los registros requieren conexión) [PENDIENTE: ¿hay Wi-Fi estable en la línea? Si no, discutir modo offline].
- **Docker** + `docker-compose` (app + postgres) para desarrollo y despliegue. [PENDIENTE: destino de hosting].

Capas:
```
UI (app/, components/)  →  API Route Handlers (app/api/)  →  Servicios (src/server/services)
                                                              →  Dominio puro (src/domain)  [sin I/O]
                                                              →  Repositorios Prisma (src/server/db)
```

---

## 10. API (REST, JSON, bajo `/api/v1`)

Errores con formato uniforme `{ error: { code, message, details? } }` y códigos HTTP correctos (400 validación, 401, 403, 404, 409 conflicto/duplicado/estado inválido, 500).

Catálogos (lectura para operario):
- `GET /catalogos/clientes`
- `GET /catalogos/modelos`
- `GET /catalogos/lineas?modeloId=`
- `GET /catalogos/estaciones?modeloId=&lineaId=`
- `GET /catalogos/responsable?lineaId=&estacionId=`
- `GET /catalogos/motivos?tipo=TIEMPO|PRODUCCION`

Producción (operario):
- `GET /producciones/en-curso` — no completadas ni anuladas del usuario/estación.
- `POST /producciones/validar-inicio` — valida campos y duplicado sin crear.
- `POST /producciones/iniciar` — crea EN_PROCESO con hora del servidor. Idempotente por `Idempotency-Key`.
- `GET /producciones/:id` — detalle + estado + `serverNow` para sincronizar el cronómetro.
- `POST /producciones/:id/finalizar` — fija hora_fin, calcula duraciones/sobretiempo/cumple y minutos en paradas → PENDIENTE_ACTIVIDADES. 409 si hay parada abierta.
- `POST /producciones/:id/paradas` — `{ tipo, detalleParadaId, comentario? }` inicia una parada. Idempotente.
- `POST /producciones/:id/paradas/:paradaId/terminar` — cierra la parada y calcula sus minutos.
- `GET /catalogos/detalles-parada?tipo=PIEZA|MATERIAL`
- `GET /producciones/:id/actividades` — checklist.
- `POST /producciones/:id/actividades` — `{ realizadas: actividadId[] }` → guarda todas las filas (SI/NO), calcula avance y no cumplidos, devuelve siguiente estado.
- `POST /producciones/:id/incidencias-tiempo` — `{ items: [{motivoId, porcentaje}] }`.
- `POST /producciones/:id/causas` — `{ items: [{motivoId}] }` en orden de importancia.

Indicadores [NUEVO]:
- `GET /indicadores/resumen?desde&hasta&lineaId&modeloId&estacionId&clienteId` — KPIs.
- `GET /indicadores/cumplimiento-estacion?…`
- `GET /indicadores/paradas?…` — por tipo y por detalle.
- `GET /indicadores/tendencia?…&granularidad=dia`
- `GET /indicadores/pareto?tipo=sobretiempo|causas&…`
- `GET /indicadores/en-vivo` — trabajos en curso y paradas abiertas por línea.

Supervisor/Admin [MEJORA PROPUESTA]:
- `GET /producciones?desde&hasta&lineaId&estacionId&estado&codigoBus&page`
- `PATCH /producciones/:id/horas` (corrección con motivo, recalcula y audita)
- `POST /producciones/:id/anular`
- `GET /exportar/producciones.xlsx` (columnas como TB_PRODUCCION y tablas hijas)
- CRUD `/admin/{clientes|modelos|lineas|estaciones|combinaciones|actividades|responsables|motivos|usuarios|jornada}`

---

## 11. Estructura del proyecto

```
control-linea/
├─ referencia/          # yaml originales, doc de ingeniería inversa, REGISTRO_CL0510.xlsx y prototipo HTML (solo lectura)
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed.ts
├─ scripts/import-excel.ts
├─ src/
│  ├─ app/
│  │  ├─ (auth)/login/
│  │  ├─ (operario)/inicio/
│  │  ├─ (operario)/trabajo/nuevo/            # Paso 1
│  │  ├─ (operario)/trabajo/[id]/cronometro/  # Paso 2
│  │  ├─ (operario)/trabajo/[id]/actividades/ # Paso 3
│  │  ├─ (operario)/trabajo/[id]/tiempo/      # Paso 4
│  │  ├─ (operario)/trabajo/[id]/causas/      # Paso 5
│  │  ├─ (operario)/trabajo/[id]/completado/
│  │  ├─ indicadores/                         # [NUEVO] panel interactivo
│  │  ├─ (supervisor)/...                     # [MEJORA PROPUESTA]
│  │  ├─ (admin)/...                          # [MEJORA PROPUESTA]
│  │  └─ api/v1/...
│  ├─ components/ (ui/, layout/, operario/: BigButton, NumericKeypad, ChipSelect, Stopwatch, StopBanner, StopDialog, StepIndicator, EditableRows, ConfirmDialog; charts/: HBarChart, SplitBar, TrendLine, KpiCard)
│  ├─ domain/ (jornada.ts, duracion.ts, paradas.ts, avance.ts, incidencias.ts, causas.ts, codigo-bus.ts, estados.ts, redondeo.ts, indicadores.ts) + *.test.ts
│  ├─ server/ (services/, db/, auth/, errors.ts, logger.ts)
│  ├─ lib/ (schemas zod, api client, fechas)
│  └─ config/env.ts   # valida variables de entorno con zod al arrancar
├─ tests/e2e/
├─ docker-compose.yml, Dockerfile, .env.example, README.md, CLAUDE.md
```

Crea un `CLAUDE.md` en la raíz que resuma las reglas de este prompt para sesiones futuras.

## 12. Variables de entorno (`.env.example`)
`DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `APP_TIMEZONE=America/Lima`, `LOG_LEVEL=info`, `NODE_ENV`, `SESSION_MAX_AGE_HOURS=12`, y opcionales comentadas para Entra ID: `AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET`, `AUTH_MICROSOFT_ENTRA_ID_ISSUER`. Nunca subir `.env` al repositorio.

## 13. Seguridad
Hash de PIN con argon2/bcrypt; bloqueo temporal tras 5 intentos fallidos; cookies httpOnly + SameSite; autorización por rol en **cada** endpoint (no solo ocultar botones); validación Zod en todas las entradas; consultas solo vía Prisma (sin SQL concatenado); cabeceras de seguridad (CSP, HSTS en producción); rate limiting en login; auditoría de correcciones y anulaciones; no exponer stack traces al cliente; registrar `usuario_id` en cada inserción.

## 14. Responsive
- **Tablet (prioridad, 768–1280 px, vertical y horizontal)**: una columna centrada, máx. 900 px; botones de ancho completo; cronómetro ocupa la mitad superior.
- **Celular (≥ 360 px)**: misma estructura, barra inferior fija con el botón principal, chips en 2 columnas.
- **PC/laptop**: operario igual centrado; supervisor/admin con tablas y filtros laterales.
- Probar en Playwright con viewports 390×844, 820×1180, 1180×820 y 1440×900. Contraste AA, `aria-label` en iconos (el verificador de Power Apps reportó falta de etiquetas accesibles).

## 15. Manejo de errores
Clase `AppError(code, httpStatus, message)`; handler central en API; toasts en UI con mensaje entendible para el operario; reintento automático solo en GET; en POST, deshabilitar el botón mientras envía y usar idempotencia; si se pierde conexión durante el cronómetro, seguir mostrando el tiempo (calculado desde `hora_inicio`) y avisar "Sin conexión" sin perder el registro.

---

## 16. Qué NO debes inventar
- No cambies las fórmulas de duración (§5.3, ya redefinida por el usuario), sobretiempo, avance, minutos no cumplidos, pesos de causas ni redondeos.
- No descuentes otras pausas (charla, lonche) además del almuerzo, ni uses TB_MOVIMIENTO.
- No cambies la regla de duplicado.
- No elimines pantallas ni pasos del flujo.
- No copies el aspecto visual de Power Apps: usa los tokens de §4 y el prototipo.
- No implementes cronómetro por actividad ni "pausa" del contador del bus: las interrupciones son paradas (§5.12).
- No descuentes las paradas del sobretiempo sin confirmación.
- No inventes catálogos, actividades, minutos ni horas estándar reales: usa seeds marcados como ejemplo.
- Todo lo marcado [MEJORA PROPUESTA] se implementa solo si lo apruebo; propónlo y espera.

## 17. Qué debes preguntarme antes de decisiones críticas
Ya confirmado (no volver a preguntar): medición por dos toques INICIO/FIN por bus-estación; ventana 07:00–19:50 con almuerzo 11:40–12:25 descontado; fuera de la ventana no cuenta y continúa al día siguiente; hora estándar en minutos (L1 360, L2 270); paradas con inicio/fin y tipo pieza/material; diseño blanco/plomo con colores MODASA; panel interactivo.

Pendiente:
1. Horario del sábado (¿07:00–16:00 o 07:00–19:50?) y si el domingo nunca cuenta.
2. Si `duracion_laboral = max(…, estándar)` se mantiene.
3. Si los minutos de parada se descuentan del sobretiempo o solo se informan.
4. Catálogo real de detalles de parada por pieza y por material; si se registra código de pieza.
5. Cronómetros simultáneos por estación/operario.
6. Regla de duplicados / retrabajos.
7. Qué fecha es la fecha de producción (por defecto, la del INICIO).
8. Separar o no los catálogos de motivos de sobretiempo y de causas.
9. Método de login, roles y quién ve qué indicadores.
10. Minutos reales de las actividades que hoy tienen 100 min, y las inconsistencias de datos de §8.
11. Hosting, Wi-Fi/offline e integración con reportes existentes (Power BI/Excel).
12. Qué hacer si una estación no tiene actividades configuradas.
13. Uso de TB_MOVIMIENTO.

---

## 18. Desarrollo por fases (obligatorio)

No construyas todo de golpe. Al terminar cada fase: muestra qué hiciste, qué archivos creaste/modificaste, qué pruebas ejecutaste con su resultado real, qué quedó pendiente y qué decisiones necesitas de mí. **Espera mi aprobación antes de pasar a la siguiente fase.** Nunca afirmes que algo funciona si no lo ejecutaste y probaste.

1. **Análisis**: lee `referencia/`, contrasta con este prompt, lista conflictos y preguntas de §17. No escribas código.
2. **Arquitectura**: scaffolding, linters (ESLint + Prettier), TypeScript estricto, Docker, `env.ts`, logger, `CLAUDE.md`, README.
3. **Base de datos**: `schema.prisma`, migraciones, seeds de ejemplo, script de importación con `--dry-run`.
4. **Backend**: dominio puro con pruebas (todos los casos de §5), servicios, autenticación, endpoints, transacciones, máquina de estados, idempotencia.
5. **Frontend**: componentes base para operario y pantallas del flujo (Paso 1 a Cierre) con datos simulados.
6. **Integración**: conectar con la API real, cronómetro sincronizado con `serverNow`, retomar trabajos en curso.
7. **Pruebas**: E2E de los 4 caminos (sin pendientes; solo sobretiempo; solo no cumplidos; ambos), trabajo con 2 paradas, intento de finalizar con parada abierta, trabajo que cruza almuerzo y noche (reloj simulado en pruebas), duplicado, recarga durante cronómetro y durante parada, doble toque en botones, filtros del panel, 4 viewports.
8. **Correcciones**: corrige lo encontrado y vuelve a ejecutar las pruebas.
9. **Optimización**: rendimiento (consultas indexadas, payloads pequeños), UX en tablet, accesibilidad.
10. **Deploy**: build de producción, migraciones en despliegue, checklist de seguridad, backups de BD, guía de operación.

Empieza ahora por la **FASE 1** y no avances sin mi confirmación.
