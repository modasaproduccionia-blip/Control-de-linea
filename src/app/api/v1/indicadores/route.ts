import { filtrosIndicadoresSchema } from '@/lib/schemas';
import { ruta } from '@/server/api';
import { indicadores } from '@/server/services/indicadores';

export const GET = ruta({}, async ({ req, sesion }) => {
  const q = Object.fromEntries([...new URL(req.url).searchParams].filter(([, v]) => v !== ''));
  return indicadores(filtrosIndicadoresSchema.parse(q), sesion);
});
