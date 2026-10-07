import { inicioSchema } from '@/lib/schemas';
import { idempotencyKey, leerJson, ruta } from '@/server/api';
import { iniciar } from '@/server/services/produccion';

export const POST = ruta({}, async ({ req, sesion, log }) => {
  const r = await iniciar(inicioSchema.parse(await leerJson(req)), sesion, idempotencyKey(req));
  log.info({ produccionId: r.id }, 'iniciar');
  return r;
});
