import { z } from 'zod';
import { actividadesSchema } from '@/lib/schemas';
import { leerJson, ruta } from '@/server/api';
import { listaActividades, registrarActividades } from '@/server/services/produccion';

export const GET = ruta<{ id: string }>({}, async ({ params }) =>
  listaActividades(z.uuid().parse(params.id)),
);

export const POST = ruta<{ id: string }>({}, async ({ req, params }) =>
  registrarActividades(
    z.uuid().parse(params.id),
    actividadesSchema.parse(await leerJson(req)).realizadas,
  ),
);
