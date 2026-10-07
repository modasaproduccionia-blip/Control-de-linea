# CONTROL DE LÍNEA — Línea de Acabados (MODASA)

Aplicación web, pensada para tablet, que registra el tiempo de cada estación sobre cada bus
(INICIO / FIN con dos toques), las paradas de producción, las actividades realizadas y los
motivos de sobretiempo e incumplimiento. Reemplaza la app Power Apps + Excel Online.

- Especificación: [`docs/PROMPT_MAESTRO.md`](docs/PROMPT_MAESTRO.md)
- Decisiones confirmadas (mandan sobre la especificación): [`docs/DECISIONES.md`](docs/DECISIONES.md)
- Análisis inicial y hallazgos de datos: [`docs/FASE1_ANALISIS.md`](docs/FASE1_ANALISIS.md)
- Referencia visual: [`docs/prototipo_control_de_linea.html`](docs/prototipo_control_de_linea.html)
- Excel original (catálogos): `referencia/REGISTRO_CL0510.xlsx`

## Tecnologías

Next.js (App Router) + TypeScript estricto · PostgreSQL · Zod · Tailwind CSS · pino · Vitest.
(Prisma, Auth.js, TanStack Query, Recharts y Playwright se agregan en sus fases.)

## Puesta en marcha (desarrollo)

```bash
nvm use                       # Node 22
npm install
cp .env.example .env          # completar AUTH_SECRET (openssl rand -base64 32)
docker compose up -d db       # PostgreSQL en localhost:5432
npm run dev                   # http://localhost:3000
```

Verificaciones: `npm run check` (lint + tipos + formato + pruebas) y `npm run build`.

## Estructura

```
src/
  app/            páginas (App Router) y API en app/api/v1
  domain/         reglas de negocio puras (sin I/O) + pruebas   ← Fase 4
  server/         logger, errores, servicios, repositorios, auth
  lib/            esquemas Zod compartidos, cliente de API, fechas
  config/env.ts   validación de variables de entorno
docs/             especificación, decisiones, análisis, prototipo
referencia/       Excel original (solo lectura)
```

## Producción

`docker compose up --build` construye la imagen (`output: 'standalone'`, usuario sin privilegios,
`TZ=America/Lima`, healthcheck en `/api/v1/health`) y levanta app + PostgreSQL.
El destino de hosting está pendiente de definir.
