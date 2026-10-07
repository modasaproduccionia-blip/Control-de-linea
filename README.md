# CONTROL DE LÍNEA — Línea de Acabados (MODASA)

Aplicación web, pensada para tablet, que reemplaza la app Power Apps + Excel Online. Registra el
tiempo de cada estación sobre cada bus con **dos toques (INICIAR / FINALIZAR)**, las **paradas de
producción** (pieza o material), las **actividades** realizadas, los **motivos de sobretiempo** y
las **causas de incumplimiento**, y muestra un **panel de indicadores** interactivo.

- Especificación: [`docs/PROMPT_MAESTRO.md`](docs/PROMPT_MAESTRO.md)
- Decisiones confirmadas (mandan sobre la especificación): [`docs/DECISIONES.md`](docs/DECISIONES.md)
- Análisis inicial y hallazgos de datos: [`docs/FASE1_ANALISIS.md`](docs/FASE1_ANALISIS.md)
- Referencia visual: [`docs/prototipo_control_de_linea.html`](docs/prototipo_control_de_linea.html)
- Excel original (catálogos): `referencia/REGISTRO_CL0510.xlsx`

## Ponerla en marcha

### Opción A — todo con Docker (recomendado para un servidor)

```bash
cp .env.example .env
# edite .env: AUTH_SECRET=$(openssl rand -base64 32), POSTGRES_PASSWORD, SEED_PIN (PIN inicial)
docker compose up --build -d
```

Abre http://localhost:3000. El servicio `migrar` aplica las migraciones, la semilla y la
importación del Excel en cada despliegue (es idempotente).

### Opción B — desarrollo local

```bash
nvm use                    # Node 22
npm install
cp .env.example .env       # completar AUTH_SECRET
docker compose up -d db    # o un PostgreSQL 16 propio en DATABASE_URL
npm run db:migrate
npm run db:import          # catálogos del Excel (ver reporte de inconsistencias)
npm run db:seed            # jornada, detalles de parada, usuarios iniciales
npm run db:demo            # opcional: datos de ejemplo para el panel
npm run dev                # http://localhost:3000
```

### Usuarios iniciales (cambie los PIN antes de usar en planta)

| Código | Rol                 | PIN por defecto   |
| ------ | ------------------- | ----------------- |
| 1000   | Administrador       | `SEED_PIN` o 1234 |
| 2000   | Supervisor          | `SEED_PIN` o 1234 |
| 3000   | Operario (línea L2) | `SEED_PIN` o 1234 |

Crear operarios reales: `npm run usuario:crear -- 4521 "Juan Pérez" OPERARIO 7391 L2`.
Tras 5 PIN incorrectos el usuario queda bloqueado 15 minutos.

## Qué incluye

| Pantalla               | Qué hace                                                                                                                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ingreso                | Código de operario + PIN con teclado numérico grande                                                                                                                                   |
| Trabajos en curso      | Tarjetas con contador en vivo; tocar una retoma el paso pendiente desde cualquier tablet                                                                                               |
| 1 · Selección          | Cliente → Modelo → Línea → Estación → Nº de bus (teclado); código de bus, responsable y hora estándar                                                                                  |
| 2 · Trabajo            | Contador de **tiempo laboral** (07:00–19:50, sin almuerzo 11:40–12:25; sábado hasta 16:00; domingo no cuenta), barra contra el estándar, paradas pieza/material con su propio contador |
| 3 · Actividades        | Checklist con avance ponderado por minutos en vivo                                                                                                                                     |
| 4 · Tiempo             | Reparto del sobretiempo en motivos (múltiplos de 5, suma 100%)                                                                                                                         |
| 5 · Causas             | Causas ordenadas por importancia con peso y minutos de impacto                                                                                                                         |
| Indicadores            | KPIs, cumplimiento por estación (clic = filtrar), paradas, tendencia diaria, paretos, últimos registros; se actualiza cada 60 s                                                        |
| Registros (supervisor) | Listado filtrable, anular con motivo (auditado) y exportar a Excel con las columnas originales                                                                                         |

Reglas de negocio en `src/domain/` (funciones puras, probadas), API REST en `/api/v1`,
PostgreSQL con Prisma. Las horas las pone el servidor; el contador sobrevive a recargas y cambios de
tablet. INICIAR y las paradas son idempotentes; dos tablets no pueden registrar el mismo paso dos veces.

## Verificación

```bash
npm run check    # lint + tipos + formato + 52 pruebas unitarias
npm run e2e      # 4 escenarios × tablet (820×1180) y celular (390×844)
npm run build
```

## Pendiente de confirmar con el negocio

- Minutos reales de las 541 actividades que están en 100 min (marcadas como provisionales).
- Catálogo real de detalles de parada (hoy: ejemplo del prompt).
- Corrección de horas por supervisor, CRUD de catálogos y usuarios desde la app (propuestos, no aprobados).
- Destino de hosting, HTTPS y respaldos de la base de datos.
