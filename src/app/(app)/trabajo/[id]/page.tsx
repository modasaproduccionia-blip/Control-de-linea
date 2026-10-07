'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { use } from 'react';
import { api } from '@/lib/api-client';
import { sincronizarReloj } from '@/lib/hooks';
import type { ProduccionDTO } from '@/server/services/produccion';
import { Cargando } from '@/components/ui';
import { Actividades } from '@/components/operario/actividades';
import { Causas } from '@/components/operario/causas';
import { Completado } from '@/components/operario/completado';
import { Cronometro } from '@/components/operario/cronometro';
import { IncidenciasTiempo } from '@/components/operario/incidencias';

/**
 * Un trabajo (bus × estación). Muestra el paso que corresponde a su estado, así se puede
 * retomar desde cualquier tablet aunque se haya cerrado la app.
 */
export default function Trabajo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['produccion', id],
    queryFn: async () => {
      const r = await api<{ produccion: ProduccionDTO; serverNow: string }>(`/producciones/${id}`);
      sincronizarReloj(r.serverNow);
      return r.produccion;
    },
    refetchInterval: (query) => (query.state.data?.estado === 'EN_PROCESO' ? 20_000 : false),
  });
  const recargar = () => qc.invalidateQueries({ queryKey: ['produccion', id] });

  if (q.isPending) return <Cargando />;
  if (q.isError) return <p className="err narrow">{(q.error as Error).message}</p>;
  const p = q.data;

  switch (p.estado) {
    case 'EN_PROCESO':
      return <Cronometro p={p} recargar={recargar} />;
    case 'PENDIENTE_ACTIVIDADES':
      return <Actividades p={p} recargar={recargar} />;
    case 'PENDIENTE_INCIDENCIAS_TIEMPO':
      return <IncidenciasTiempo p={p} recargar={recargar} />;
    case 'PENDIENTE_CAUSAS':
      return <Causas p={p} recargar={recargar} />;
    default:
      return <Completado p={p} />;
  }
}
