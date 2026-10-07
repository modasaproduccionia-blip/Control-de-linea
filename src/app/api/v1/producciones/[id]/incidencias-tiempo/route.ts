import { z } from 'zod';
import { incidenciasSchema } from '@/lib/schemas';
import { leerJson, ruta } from '@/server/api';
import { registrarIncidencias } from '@/server/services/produccion';

export const POST = ruta<{ id: string }>({}, async ({ req, params }) =>
  registrarIncidencias(
    z.uuid().parse(params.id),
    incidenciasSchema.parse(await leerJson(req)).items,
  ),
);
