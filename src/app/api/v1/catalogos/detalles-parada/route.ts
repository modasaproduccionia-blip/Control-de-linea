import { ruta } from '@/server/api';
import { detallesParada } from '@/server/services/catalogos';

export const GET = ruta({}, async () => ({ detalles: await detallesParada() }));
