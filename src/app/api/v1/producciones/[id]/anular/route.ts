import { z } from 'zod';
import { anularSchema } from '@/lib/schemas';
import { leerJson, ruta } from '@/server/api';
import { anular } from '@/server/services/produccion';

export const POST = ruta<{ id: string }>({ roles: ['SUPERVISOR', 'ADMIN'] }, async ({ req, params, sesion, log }) => {
  const r = await anular(z.uuid().parse(params.id), anularSchema.parse(await leerJson(req)).motivo, sesion);
  log.info({ produccionId: params.id }, 'anular');
  return r;
});
