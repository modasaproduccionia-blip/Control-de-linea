import { ruta } from '@/server/api';
import { listado } from '@/server/services/supervisor';

export const GET = ruta({ roles: ['SUPERVISOR', 'ADMIN'] }, async ({ req }) => {
  const q = new URL(req.url).searchParams;
  const v = (k: string) => q.get(k) || undefined;
  return { producciones: await listado({ desde: v('desde'), hasta: v('hasta'), lineaId: v('lineaId'), estado: v('estado'), codigoBus: v('codigoBus') }) };
});
