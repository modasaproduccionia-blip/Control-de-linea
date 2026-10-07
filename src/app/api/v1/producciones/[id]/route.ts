import { z } from 'zod';
import { ruta } from '@/server/api';
import { obtener } from '@/server/services/produccion';

export const GET = ruta<{ id: string }>({}, async ({ params }) => obtener(z.uuid().parse(params.id)));
