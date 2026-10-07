import { ruta } from '@/server/api';

export const GET = ruta({}, async ({ sesion }) => ({ usuario: sesion }));
