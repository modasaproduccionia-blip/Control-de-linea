import { ruta } from '@/server/api';
import { motivos } from '@/server/services/catalogos';

export const GET = ruta({}, async ({ req }) => {
  const tipo = new URL(req.url).searchParams.get('tipo');
  return { motivos: await motivos(tipo === 'TIEMPO' || tipo === 'PRODUCCION' ? tipo : undefined) };
});
