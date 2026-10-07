import { z } from 'zod';
import { causasSchema } from '@/lib/schemas';
import { leerJson, ruta } from '@/server/api';
import { registrarCausas } from '@/server/services/produccion';

export const POST = ruta<{ id: string }>({}, async ({ req, params }) =>
  registrarCausas(z.uuid().parse(params.id), causasSchema.parse(await leerJson(req)).items),
);
