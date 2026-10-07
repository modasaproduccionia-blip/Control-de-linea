import { inicioSchema } from '@/lib/schemas';
import { leerJson, ruta } from '@/server/api';
import { validarInicio } from '@/server/services/produccion';

export const POST = ruta({}, async ({ req }) =>
  validarInicio(inicioSchema.parse(await leerJson(req))),
);
