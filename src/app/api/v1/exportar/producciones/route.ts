import { ruta } from '@/server/api';
import { exportarXlsx } from '@/server/services/supervisor';

export const GET = ruta({ roles: ['SUPERVISOR', 'ADMIN'] }, async ({ req }) => {
  const q = new URL(req.url).searchParams;
  const v = (k: string) => q.get(k) || undefined;
  const buf = await exportarXlsx({
    desde: v('desde'),
    hasta: v('hasta'),
    lineaId: v('lineaId'),
    estado: v('estado'),
  });
  return new Response(new Uint8Array(buf), {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="control_linea_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      'cache-control': 'no-store',
    },
  });
});
