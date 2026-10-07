import { z } from 'zod';
import { ruta } from '@/server/api';
import { terminarParada } from '@/server/services/produccion';

export const POST = ruta<{ id: string; paradaId: string }>({}, async ({ params }) =>
  terminarParada(z.uuid().parse(params.id), z.uuid().parse(params.paradaId)),
);
