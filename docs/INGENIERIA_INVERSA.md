# CONTROL DE LÍNEA (APP – LÍNEA DE ACABADOS) — Documentación de ingeniería inversa

Fuente analizada: `APP_CONTROL_DE_LÍNEA_ACABADOS.msapp` (guardado 06/10/2026, Power Apps Canvas, DocVersion 1.349) + 4 capturas.
Se leyeron directamente los archivos `Src/*.pa.yaml` (fórmulas reales), `References/DataSources.json` (esquema de tablas) y `AppCheckerResult.sarif` (advertencias del verificador).

Convención de certeza usada en todo el documento:

- **[C] Confirmado**: está literalmente en las fórmulas, el esquema o las capturas.
- **[I] Inferido**: se deduce con alta probabilidad, pero no está escrito explícitamente.
- **[?] Desconocido / requiere confirmación**.

---

## A. Resumen de la aplicación

**Qué es [C]:** una app de registro de producción para la **Línea de Acabados** (los logos embebidos son de MODASA, fabricante de buses). Cada registro representa el trabajo de **una estación sobre un bus** en una ventana de tiempo (hora inicio → hora fin).

**Qué mide [C]:**

1. **Tiempo**: compara la duración laboral real del trabajo contra una **hora estándar por línea** → calcula **sobretiempo** y si **cumple tiempo** (SI/NO).
2. **Avance**: el operario marca qué actividades estándar de su estación (según modelo y línea) realizó; cada actividad pesa según sus **minutos estándar** → % de avance y **minutos no cumplidos**.
3. **Incidencias**: si hubo sobretiempo, se registran los motivos con un % de reparto (deben sumar 100%). Si hubo minutos no cumplidos, se registran las causas ordenadas por importancia con un peso decreciente.

**Backend actual [C]:** un libro de **Excel Online (Empresas)** en OneDrive con 13 tablas. Todas las columnas son texto (`string`), incluso números y fechas. Clave primaria = `__PowerAppsId__` autogenerada por el conector.

---

## B. Usuarios

| Usuario | Qué hace | Certeza |
|---|---|---|
| Operario / líder de estación | Llena el registro de producción, marca actividades, registra incidencias y causas | [I] (la app no distingue usuarios) |
| Responsable de estación | No usa la app necesariamente: su nombre se **autocompleta** desde `TB_RESPONSABLE` por Línea + Estación | [C] |
| Administrador de datos | Mantiene catálogos editando el Excel directamente (no hay pantallas de mantenimiento) | [I] |

**No existe** login propio, roles ni permisos dentro de la app [C]. No se usa `User()`. Quien tenga acceso al Excel puede leer y escribir todo.

---

## C. Flujo completo actual [C]

```
Screen1 (APP - LÍNEA DE ACABADOS)
  └─ REGISTRAR → validaciones → SubmitForm → INSERT TB_PRODUCCION
       └─ SCR_ACTIVIDADES (checklist)
            └─ REGISTRAR ACTIVIDADES → INSERT TB_CONTROL_ACTIVIDADES (1 fila por actividad)
                                     → UPDATE TB_PRODUCCION (avance, minutos no cumplidos)
                 ├─ si Sobretiempo > 0 ───────────► Screen4 (INCIDENCIAS - TIEMPO)
                 │                                     └─ REGISTRAR → INSERT TB_INCIDENCIAS
                 │                                          ├─ si MinutosNoCumplidos > 0 → SCR_CAUSAS
                 │                                          └─ si no → Screen1
                 ├─ si no, y MinutosNoCumplidos > 0 ► SCR_CAUSAS (INCIDENCIAS PRODUCCIÓN)
                 │                                     └─ REGISTRAR → INSERT TB_CAUSAS_INCUMPLIMIENTO → Screen1
                 └─ si no ─────────────────────────► "Registro enviado" → Screen1
```

Todo el contexto entre pantallas viaja en **variables globales** en memoria (`varRegistro`, `varModelo`, `varLinea`, `varEstacion`, `varFechaProduccion`, `varHoraEstandar`, `varMinutosNoCumplidos`). Si la app se cierra a mitad del flujo, se pierde el contexto y quedan registros incompletos [C/I].

---

## D. Pantallas

### D.1 Screen1 — "APP - LÍNEA DE ACABADOS" (registro de producción)

- **OnVisible:** `NewForm(Form1)` → siempre abre un formulario nuevo [C].
- **Form1** sobre `TB_PRODUCCION`, modo Nuevo, 1 columna. Campos en orden:

| # | Campo (columna) | Control | Fuente / regla | Visible |
|---|---|---|---|---|
| 1 | FechaProduccion | DatePicker (+ un dropdown de minutos residual sin uso) | Por defecto hoy. Se guarda `DateValue(fecha)` | Sí |
| 2 | Cliente | Dropdown | Items = `TB_CLIENTE` (muestra `Cliente`) | Sí |
| 3 | Modelo | Dropdown | Items = `Distinct(TB_ESTACIONES, MODELO)` | Sí (captura: ZEUS5) |
| 4 | Linea | Dropdown | `Distinct(Filter(TB_ESTACIONES, MODELO = modelo), Linea)` | Sí (L2) |
| 5 | Estacion | Dropdown | `Distinct(Filter(TB_ESTACIONES, MODELO = modelo), Estacion)` — **filtra solo por Modelo, no por Línea** | Sí (E21) |
| 6 | CodigoBus | TextInput + etiqueta en vivo | El operario escribe 3 dígitos; se guarda `SiglaCliente & dígitos` (captura: escribe `123`, etiqueta muestra `CM123`) | Sí |
| 7 | HoraInicio | Fecha + hora (00–23) + minuto (00–59) | Se combina en un DateTime y se le resta `TimeZoneOffset` | Sí |
| 8 | HoraFin | Igual que HoraInicio | Igual | Sí |
| 9 | HoraEstandar | Dropdown oculto (Items vacío, error del checker) | Guarda `varHoraEstandar` | No |
| 10 | Responsable | TextInput solo lectura | `LookUp(TB_RESPONSABLE, Estacion = estación && Linea = línea, Responsable)` | Sí (solo lectura) |
| 11 | DuracionLaboralReal | Calculado | Ver G.3 | No |
| 12 | DuracionReal | Calculado | Ver G.2 | No |
| 13 | Sobretiempo | Calculado | Ver G.4 | No |
| 14 | CumpleTiempo | Calculado | Ver G.5 | No |
| 15 | IDProduccion | Calculado | `GUID()` | No |

- **Botón REGISTRAR:** ver validaciones en I.1. Si pasa: limpia `colSeleccionados`, guarda variables de contexto, busca la hora estándar de la línea, `SubmitForm`. **OnSuccess:** `varRegistro = Form1.LastSubmit` → navega a SCR_ACTIVIDADES.
- Hay 3 imágenes de logo (MODASA) cargadas pero sin uso.

### D.2 SCR_ACTIVIDADES (checklist de actividades)

- **OnVisible:** `Clear(colSeleccionados)`.
- **Gallery5:** `Filter(TB_ACTIVIDADES, MODELO = varModelo && Estacion = varEstacion && Linea = varLinea)` comparando con `Lower(Trim())` (insensible a mayúsculas/espacios) [C].
- Cada fila (captura): checkbox `chkRealizada`, minutos estándar (198, 252, 366…), nombre de actividad ("Masillar Zona de cabina", "Lijar Zona de cabina"…) y estación (E21).
  - Marcar → agrega `{Actividad, minutos}` a `colSeleccionados`. Desmarcar → lo quita.
- Pie: etiqueta `Modelo - Línea - Estación` (captura: `ZEUS5 - L2 - E21`).
- **Botón REGISTRAR ACTIVIDADES:** confirmación → inserta una fila por actividad en `TB_CONTROL_ACTIVIDADES` con `Realizada = SI/NO` → calcula avance y minutos no cumplidos → actualiza `TB_PRODUCCION` → navega según G.8.

### D.3 Screen4 — "CONTROL DE INCIDENCIAS - TIEMPO" (motivos del sobretiempo)

- **OnVisible:** `colIncidencias = [{Motivo:"", Porcentaje:0}]` (una fila vacía).
- Cada fila: dropdown Motivo (`TB_MOTIVOS.MOTIVOS`; muestra "Seleccione motivo-------"), dropdown % (0%, 5%, … 100%), etiqueta "Valor de tiempo = X h Y min" = `% × Sobretiempo`.
- Texto fijo abajo: `Sobretiempo total: {Sobretiempo/60} hora ({Sobretiempo} min)` (captura: 8,5 hora (510 min)).
- Botones: **Eliminar motivo** (rojo; quita la fila seleccionada), **Agregar motivo** (verde; agrega fila vacía), **REGISTRAR** (azul).

### D.4 SCR_CAUSAS — "CONTROL DE INCIDENCIAS PRODUCCIÓN" (causas de minutos no cumplidos)

- **OnVisible:** `colCausas = [{ID:1, Incumplimiento: First(TB_MOTIVOS).MOTIVOS}]`.
- Texto: "Se dejaron de ejecutar {varMinutosNoCumplidos} minutos de trabajo. ¿Cuáles fueron las principales causas?"
- Cada fila: dropdown de causa (también usa `TB_MOTIVOS`), icono **+** (agrega fila vacía), icono **papelera** (borra la fila si hay más de una).
- **El orden de las filas = orden de importancia** (la primera es la más importante) [C].
- Botón **REGISTRAR**.

> Nota de la captura 4: el texto dice "Se dejaron de ejecutar  minutos" (vacío) porque en el editor `varMinutosNoCumplidos` no tiene valor. No es un error funcional.

---

## E. Componentes reutilizables (patrones observados)

- Encabezado con título centrado en mayúsculas (tarjeta blanca, sombra).
- Contenedor principal blanco con scroll.
- Pie con botón primario azul marino `#003366` (RGBA 0,51,102), texto blanco en mayúsculas.
- Acento de bordes `#0059B2`. Botones de Screen4: rojo (eliminar), verde (agregar), azul `#3A5FB0` aprox. (registrar).
- Fuente Open Sans / Lato (títulos).
- Diálogo de confirmación nativo (`Confirm`) antes de cada registro.
- Notificaciones tipo toast (`Notify`) de error, éxito e información.
- "Lista editable de filas" (Screen4 y SCR_CAUSAS): agregar/quitar filas con dropdown por fila.

---

## F. Base de datos actual (Excel Online, todas las columnas `string`)

| Tabla | Propósito | Columnas | Usada en | Operaciones |
|---|---|---|---|---|
| **TB_PRODUCCION** | Registro principal (bus × estación × ventana de tiempo) | IDProduccion, FechaProduccion, Responsable, Estacion, Linea, CodigoBus, Cliente, HoraInicio, HoraFin, DuracionReal, HoraEstandar, Sobretiempo, CumpleTiempo, Modelo, AvanceFinalNuevo, AvanceFinalNuevo2, DuracionLaboralReal, MinutosNoCumplidos | Screen1, SCR_ACTIVIDADES | INSERT, UPDATE, SELECT (duplicados) |
| **TB_CONTROL_ACTIVIDADES** | Checklist realizado por producción | IDRegistro, IDProduccion, Fecha, Estacion, CodigoBus, Actividad, Realizada (SI/NO), FechaProduccion | SCR_ACTIVIDADES | INSERT |
| **TB_INCIDENCIAS** | Motivos del sobretiempo | IDMotivo, IDProduccion, Estacion, CodigoBus, Motivo, Fecha, Porcentaje, TiempoImpacto, FechaProduccion | Screen4 | INSERT |
| **TB_CAUSAS_INCUMPLIMIENTO** | Causas de minutos no ejecutados | IDCausa, IDProduccion, CodigoBus, Estacion, Motivoproduccion, OrdenImportancia, PesoAsignado, MinutosImpacto, FechaProduccion | SCR_CAUSAS | INSERT |
| **TB_ACTIVIDADES** (catálogo) | Actividades estándar por Modelo+Línea+Estación con minutos estándar | MODELO, Estacion, Actividad, Linea, minutos | SCR_ACTIVIDADES | SELECT |
| **TB_ESTACIONES** (catálogo) | Combinaciones válidas Modelo–Línea–Estación | MODELO, Estacion, Linea | Screen1 | SELECT |
| **TB_CLIENTE** (catálogo) | Clientes y su sigla para el código de bus | Cliente, SiglaCliente | Screen1 | SELECT |
| **TB_RESPONSABLE** (catálogo) | Responsable por Línea+Estación | Estacion, Linea, Responsable | Screen1 | SELECT |
| **TB_PARAMETROS_LINEA** (catálogo) | Hora estándar por línea | Linea, HoraEstandar | Screen1 | SELECT |
| **TB_MOTIVOS** (catálogo) | Motivos (usados para incidencias de tiempo **y** causas de producción) | MOTIVOS | Screen4, SCR_CAUSAS | SELECT |
| TB_HORARIOS | Horario laboral por día | IdHorario, Dia, HoraInicio, HoraFin, EsLaboral, HoraInicioTexto, HoraFinTexto | **Ninguna** | — |
| TB_PAUSAS | Pausas (refrigerio, etc.) | Tipo, HoraInicio, HoraFin, Minutos | **Ninguna** | — |
| TB_MOVIMIENTO | Desconocido | TipoMovimiento, Horas, Minutos | **Ninguna** (el dropdown oculto de HoraEstandar parece haber apuntado a `Horas`) | — |

Relaciones implícitas (no hay FK reales) [C]:
`TB_PRODUCCION.IDProduccion` 1 → N `TB_CONTROL_ACTIVIDADES`, `TB_INCIDENCIAS`, `TB_CAUSAS_INCUMPLIMIENTO` (por el mismo campo `IDProduccion`, GUID).
Catálogos relacionados por **texto** (Modelo, Línea, Estación, Cliente, Motivo).

Campos nunca escritos por la app [C]: `TB_PRODUCCION.AvanceFinalNuevo`, `TB_CONTROL_ACTIVIDADES.Fecha`, `TB_INCIDENCIAS.Fecha`.

---

## G. Lógica de negocio (fórmulas traducidas)

### G.1 Código de bus [C]
`CodigoBus = SiglaCliente(del cliente seleccionado) + 3 dígitos escritos`. Ej.: cliente con sigla `CM` + `123` → `CM123`. El modelo del bus **no** forma parte del código.

### G.2 DuracionReal [C]
Minutos brutos entre HoraInicio y HoraFin. Si falta alguna → 0. No descuenta nada.

### G.3 DuracionLaboralReal [C] (la regla más importante)
Primero calcula `minutosLaborales`:

1. **Mismo día** (fecha inicio = fecha fin): `fin − inicio` en minutos. **No descuenta refrigerio/pausas.**
2. **Inicio sábado y fin lunes**: `(sábado 16:00 − inicio) + (fin − lunes 07:00)`.
3. **Cualquier otro caso de días distintos**: `(día inicio 19:50 − inicio) + (fin − día fin 07:00)`.

Luego: `DuracionLaboralReal = Max(minutosLaborales, HoraEstandar de la línea)` → **nunca es menor que el estándar** [C]. ¿Es intencional? [?]

Constantes de jornada codificadas en la fórmula [C]: entrada 07:00; salida L–V 19:50; salida sábado 16:00; domingo no laborable (implícito).

Limitaciones [C]: si el trabajo abarca más de 2 días (ej. lunes→miércoles), los días intermedios **no se cuentan**; si inicia viernes y termina lunes se usa la regla 3 (salida 19:50) y se ignora el sábado.

Zona horaria [C/I]: HoraInicio/HoraFin se guardan restando `TimeZoneOffset` (en Lima, −5 h → se resta 300 min) para compensar el conector de Excel. En los cálculos el desfase se cancela entre los dos tramos, así que el resultado en minutos es correcto, pero **los valores guardados en Excel pueden estar desplazados 5 horas** [? confirmar mirando el Excel].

### G.4 Sobretiempo [C]
`Sobretiempo = Max(DuracionLaboralReal − HoraEstandar(línea), 0)` en minutos.
Unidad de `HoraEstandar`: se resta de minutos, por lo tanto **está en minutos** [I] (el nombre sugiere horas) [? confirmar].

### G.5 CumpleTiempo [C]
`"NO"` si Sobretiempo > 0, si no `"SI"`.

### G.6 Avance de actividades (AvanceFinalNuevo2) [C]
`Avance % = Σ minutos de actividades marcadas / Σ minutos de todas las actividades de la estación × 100`, redondeado a 1 decimal. Es un avance **ponderado por minutos estándar**, no por cantidad de actividades.
(`varAvance` multiplica por 10000 y no se usa: código muerto.)

### G.7 MinutosNoCumplidos [C]
`MinutosNoCumplidos = Round(DuracionLaboralReal × (100 − Avance%) / 100, 0)`.
Ojo: se calcula sobre la **duración laboral** (no sobre los minutos estándar de las actividades). Si no hay actividades, el divisor se protege con `Max(...,1)` → avance 0 → todos los minutos quedan como no cumplidos. Pero `AvanceFinalNuevo2` sí divide entre 0 → error/vacío [C].

### G.8 Navegación posterior a actividades [C]
1. Si `Sobretiempo > 0` → Incidencias de tiempo (y luego causas si `MinutosNoCumplidos > 0`).
2. Si no, si `MinutosNoCumplidos > 0` → Causas.
3. Si no → "Registro enviado" y vuelve al inicio.

### G.9 Incidencias de tiempo (Screen4) [C]
- Cada motivo tiene un % (múltiplos de 5).
- Validaciones: motivos no repetidos (ignorando vacíos); suma de % = 100% exacto.
- Por fila guarda: `Porcentaje` (entero 0–100), `TiempoImpacto = % × Sobretiempo` (minutos, 2 decimales), más IDProduccion, Estación, CodigoBus, FechaProduccion.

### G.10 Causas de incumplimiento (SCR_CAUSAS) [C]
- Peso por orden de importancia, lineal decreciente: con N causas, la causa en posición `s` pesa `(N − s + 1) / (1 + 2 + … + N)`.
  - Ej. N=3 → 50%, 33%, 17%. N=2 → 67%, 33%. N=1 → 100%.
- `PesoAsignado = Round(peso × 100)` (entero).
- `MinutosImpacto = Round(MinutosNoCumplidos × PesoAsignado / 100)` (si el peso redondeado es ≤1 usa el peso sin redondear).
- Como hay redondeo, la suma de MinutosImpacto puede no coincidir exactamente con MinutosNoCumplidos [C].
- Validaciones: causas no repetidas; al menos 1 fila.

---

## H. Estados actuales

No hay campo de estado [C]. El "estado" es implícito por la pantalla en que está el usuario. Estados derivables:

- Producción registrada sin actividades (si se cerró la app en SCR_ACTIVIDADES).
- Producción con actividades, sin incidencias/causas pendientes.
- Producción con sobretiempo sin motivos registrados (si se abandonó Screen4).
- Producción con minutos no cumplidos sin causas (si se abandonó SCR_CAUSAS).
- Completa.

`CumpleTiempo` (SI/NO) y `Realizada` (SI/NO) son los únicos "estados" escritos, como texto libre.

---

## I. Validaciones actuales

### I.1 Screen1 – REGISTRAR [C]
1. Confirmación "¿Confirmas el registro de producción?" (si cancela → "Registro cancelado").
2. Hora de inicio y hora de fin deben ser > 0 → **rechaza cualquier hora 00:xx** (efecto colateral) — mensaje "Debe ingresar una hora de inicio y una hora de fin válidas".
3. CodigoBus: exactamente 3 dígitos `^\d{3}$` — "Debe ingresar exactamente 3 dígitos. Ejemplo: 001".
4. Duplicado: no debe existir en `TB_PRODUCCION` otro registro con el mismo **CodigoBus + Estacion** (sin importar fecha ni línea) — "Este Código Bus ya fue registrado en esta estación."

**No valida [C]:** que Cliente/Modelo/Línea/Estación estén seleccionados; que fin > inicio (puede quedar duración negativa); que la estación pertenezca a la línea; que exista hora estándar para la línea.

### I.2 SCR_ACTIVIDADES [C]
Solo confirmación. Se permite registrar con 0 actividades marcadas.

### I.3 Screen4 [C]
Confirmación, sin motivos repetidos, suma = 100%. Permite guardar filas con motivo vacío o con el texto "Seleccione motivo-------" [I].

### I.4 SCR_CAUSAS [C]
Confirmación, sin causas repetidas, ≥1 fila. La primera fila arranca con `First(TB_MOTIVOS)`, que según la captura es el texto **"Seleccione motivo-------"** (es una fila del Excel usada como placeholder) [I] → se puede guardar el placeholder como causa.

---

## J. Roles y permisos actuales

Ninguno [C]. Cualquier usuario con acceso al libro Excel puede insertar, y modificar/borrar desde Excel.

---

## K. Problemas detectados

### Rendimiento
- Excel Online como base de datos: lento, límite de delegación (500/2000 filas). El verificador marca `And` como **no delegable** en: chequeo de duplicados, LookUp de responsable y filtro de actividades [C]. **Consecuencia:** cuando `TB_PRODUCCION` supere el límite, el chequeo de duplicados deja de ver los registros más nuevos/antiguos y se colarán duplicados.
- `ForAll` + `Patch` fila por fila (actividades, incidencias, causas) = muchas llamadas al conector [C].
- `Refresh` de 3 tablas completas tras cada registro.

### Datos / integridad
- Todo es texto; sin tipos, sin FK, sin catálogos con ID.
- Registros huérfanos o incompletos si se abandona el flujo (no hay transacción).
- Placeholder "Seleccione motivo-------" guardado como dato en `TB_MOTIVOS` [I].
- Mismo catálogo `TB_MOTIVOS` para motivos de sobretiempo y causas de producción [C] (¿deben ser catálogos distintos? [?]).
- Columnas sin uso: AvanceFinalNuevo, Fecha (×2); tablas sin uso: TB_HORARIOS, TB_PAUSAS, TB_MOVIMIENTO.
- Desfase horario potencial de 5 h en lo guardado [?].
- Estación filtrada solo por Modelo (puede mostrar estaciones de otra línea) [C].
- Posible bug: en el guardado de actividades se usa `chkRealizada.Value` dentro de `ForAll(Gallery5.AllItems)`; Power Apps marca el patrón como riesgoso (ForAllWithMutation). Verificar en el Excel que `Realizada` coincide con lo marcado [?].

### UX (operario en planta)
- Hora inicio/fin se digitan manualmente con 3 controles cada una (fecha + hora + minuto) → lento y propenso a error; no refleja el tiempo real trabajado.
- Dropdowns pequeños, poco aptos para tablet con guantes.
- Hay que escribir el código de bus y elegir cliente cada vez.
- No se puede retomar un registro interrumpido.
- No se ve resumen (duración, sobretiempo, avance) antes de confirmar.

### Seguridad
- Sin autenticación propia ni trazabilidad de quién registró.
- Edición/borrado posible directamente en Excel sin auditoría.

### Mantenimiento
- Constantes de jornada (07:00, 19:50, 16:00) codificadas en la fórmula.
- Lógica de negocio dispersa en propiedades de controles.
- Variables globales y dependencias entre pantallas (CrossScreenEventDependencies).

---

## L. Nuevo requerimiento del usuario (cronómetro)

Solicitado en este chat [C]:

1. Hacer la app más amigable para el personal operativo.
2. Reemplazar la digitación de HoraInicio/HoraFin por un **cronómetro**: el operario primero **selecciona el bus y la estación**, luego pulsa **INICIO**, luego **FIN**, y la app cuenta el tiempo.
3. Al pulsar FIN, pasar a la pantalla de datos (actividades) para que el trabajo **se mida por tiempo**.
4. El usuario indicó que proporcionará más datos sobre esta medición.

Interpretación propuesta (se detalla en el prompt maestro): las marcas de INICIO y FIN las toma el **servidor** (no el reloj de la tablet), el registro queda en estado "EN PROCESO" mientras corre el cronómetro (sobrevive a cierres de la app y a cambios de turno), y al FIN se aplican **las mismas reglas de G.3–G.5** para obtener DuracionLaboralReal, Sobretiempo y CumpleTiempo.

---

## M. Información que necesito confirmar antes de desarrollar

1. **Unidad de `HoraEstandar`** en `TB_PARAMETROS_LINEA`: ¿minutos u horas? (la fórmula la trata como minutos). Valores actuales por línea.
2. **`Max(duración, estándar)`** en DuracionLaboralReal: ¿es intencional que nunca sea menor que el estándar? Afecta MinutosNoCumplidos.
3. **Jornada**: ¿07:00–19:50 L–V y 07:00–16:00 sábado es correcto? ¿Se debe descontar refrigerio/pausas? ¿Para eso existen TB_HORARIOS y TB_PAUSAS? ¿Qué es TB_MOVIMIENTO?
4. **Trabajos de más de 2 días** y viernes→lunes: ¿cómo deben contarse?
5. **Cronómetro**: ¿se necesita botón de PAUSA (refrigerio, falta de material)? ¿Pueden correr varios cronómetros a la vez en una estación (varios buses)? ¿Un mismo bus puede estar en dos estaciones a la vez?
6. **"Que se mida por tiempo"** en la pantalla de datos: ¿el tiempo se mide por bus-estación (como hoy) o quieres **cronometrar cada actividad** por separado? Los datos que mencionaste que me enviarás probablemente resuelven esto.
7. **Duplicados**: ¿la regla CodigoBus + Estación sin fecha es correcta? (Hoy un bus no puede volver a registrarse en la misma estación nunca, ni por retrabajo.)
8. **FechaProduccion**: ¿debe ser la fecha del INICIO, la del FIN o elegida por el operario?
9. **Catálogos de motivos**: ¿separar motivos de sobretiempo y causas de producción?
10. **Usuarios**: ¿login individual (DNI/código + PIN), tablet fija por estación, o cuenta Microsoft 365? ¿Quién edita/anula registros (supervisor)?
11. **Datos actuales**: ¿migrar el histórico del Excel? ¿Me compartes una copia (o muestra) del Excel con los catálogos y algunos registros reales?
12. **Infraestructura**: ¿dónde se alojará (Azure de la empresa, nube pública, servidor local en planta)? ¿Hay Wi-Fi estable en la línea?
13. Confirmar en el Excel que `TB_CONTROL_ACTIVIDADES.Realizada` coincide con lo marcado y si las horas guardadas tienen desfase de 5 h.

---

## N. Actualización 2 — respuestas del usuario y análisis de `REGISTRO_CL0510.xlsx`

### N.1 Confirmado por el usuario
- **Medición por tiempo** = dos toques (INICIO y FIN) por bus-estación; el contador muestra el tiempo en vivo. No se cronometra cada actividad.
- **Ventana que cuenta:** 07:00 a 19:50. El horario oficial es 07:00–17:20, pero casi siempre se trabaja hasta 19:50 y todo ese tramo cuenta. Fuera de la ventana no cuenta; si el trabajo sigue, continúa al día siguiente desde las 07:00, y los días intermedios cuentan completos.
- **Almuerzo 11:40–12:25** no se cuenta.
- **Paradas de producción:** se registran con inicio y fin, y el operario indica si la parada es por **pieza** o por **material**.
- **Diseño:** no copiar la app actual; versión mejorada en blanco y plomo con colores MODASA, amigable para el operario.
- **Interactivo:** panel de indicadores con filtros y clic para filtrar.

Esto **reemplaza** la regla original de G.3 (cortes fijos 19:50 / sábado 16:00 sin almuerzo y sin días intermedios).

### N.2 Hallazgos del Excel (solo catálogos; no trae registros de producción)
| Tabla | Hallazgo |
|---|---|
| TB_PARAMETROS_LINEA | **HoraEstandar en minutos confirmado**: L1 = 360, L2 = 270. Cuadra con la captura (780 − 270 = 510 min de sobretiempo). |
| TB_HORARIOS | L–J 07:00–19:50, **V 07:00–17:20**, **S 07:00–16:00**, D no laborable. Difiere de lo dicho por el usuario para el viernes. |
| TB_PAUSAS | Charla 07:00–07:20, **Refrigerio 11:15–12:00**, Lonche 19:00–19:15. El usuario indicó almuerzo **11:40–12:25** (manda lo dicho). |
| TB_MOTIVOS | 19 motivos + el placeholder "Seleccione motivo-------" como primera fila (confirma el riesgo de I.4). |
| TB_ESTACIONES | 47 combinaciones; modelos ZEUS5, 360F (L2) y APOLO X, TUDFG, TUVWG (L1). |
| TB_ACTIVIDADES | 671 filas. 550 tienen exactamente 100 min (todas las de 360F, APOLO X, TUDFG, TUVWG) → probable valor provisional. 5 actividades duplicadas en ZEUS5 E26/E27. Hay actividades para APOLO X/L2/MF PAQUETERA y ZEUS5/L2/E20, combinaciones que no existen en TB_ESTACIONES. 360F/L2/E28 no tiene actividades. |
| TB_CLIENTE | 40 clientes, siglas únicas. |
| TB_RESPONSABLE | 17 filas; no hay responsable para las estaciones MF PAQUETERA. |
| TB_MOVIMIENTO | Lista 4 H … 10 H (240–600 min). Uso desconocido; parece una opción antigua para elegir la hora estándar. |

### N.3 Pendiente de confirmar
1. Sábado: ¿07:00–16:00 (Excel) o 07:00–19:50? ¿Domingo nunca cuenta?
2. Viernes: ¿19:50 (lo dicho) o 17:20 (TB_HORARIOS)?
3. Charla (07:00–07:20) y lonche (19:00–19:15): ¿se cuentan? (Por defecto sí.)
4. ¿Las paradas se descuentan del sobretiempo o solo se informan?
5. Catálogo real de detalles de parada por pieza y por material.
6. Minutos reales de las actividades que están en 100 min y las inconsistencias de la tabla N.2.
7. Se mantienen los puntos 2, 7, 8, 9, 10, 11 y 12 de la sección M.
