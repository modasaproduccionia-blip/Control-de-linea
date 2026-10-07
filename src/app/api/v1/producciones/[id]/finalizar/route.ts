import { z } from 'zod';
import { ruta } from '@/server/api';
import { finalizar } from '@/server/services/produccion';

export const POST = ruta<{ id: string }>({}, async ({ params, sesion }) =>
  finalizar(z.uuid().parse(params.id), sesion),
);
