import { z } from 'zod';
import { paradaSchema } from '@/lib/schemas';
import { idempotencyKey, leerJson, ruta } from '@/server/api';
import { iniciarParada } from '@/server/services/produccion';

export const POST = ruta<{ id: string }>({}, async ({ req, params, sesion }) =>
  iniciarParada(
    z.uuid().parse(params.id),
    paradaSchema.parse(await leerJson(req)),
    sesion,
    idempotencyKey(req),
  ),
);
