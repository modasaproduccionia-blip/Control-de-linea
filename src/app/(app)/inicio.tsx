'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ETIQUETA_ESTADO } from '@/domain/estados';
import { msLaborales } from '@/domain/jornada';
import { api } from '@/lib/api-client';
import { hms } from '@/lib/formato';
import { sincronizarReloj, useAhora } from '@/lib/hooks';
import type { ProduccionDTO } from '@/server/services/produccion';
import { BarraAcciones, Cargando, Etiqueta } from '@/components/ui';

/** Inicio: trabajos en curso o pendientes (se pueden retomar) + NUEVO TRABAJO. */
export function Inicio() {
  const q = useQuery({
    queryKey: ['en-curso'],
    queryFn: async () => {
      const r = await api<{ producciones: ProduccionDTO[]; serverNow: string }>(
        '/producciones/en-curso',
      );
      sincronizarReloj(r.serverNow);
      return r;
    },
    refetchInterval: 30_000,
  });
  const ahora = useAhora(1000);
  const lista = q.data?.producciones ?? [];

  return (
    <div className="narrow">
      <h1>Trabajos en curso</h1>
      <p className="lead">Toca un trabajo para continuar, o inicia uno nuevo.</p>
      {q.isPending ? (
        <Cargando />
      ) : q.isError ? (
        <p className="err">{(q.error as Error).message}</p>
      ) : lista.length ? (
        <div className="jobs">
          {lista.map((j) => {
            const parada = j.paradas.find((p) => !p.horaFin);
            return (
              <Link
                key={j.id}
                href={`/trabajo/${j.id}`}
                className={`job ${parada ? 'stopping' : ''}`}
              >
                <span>
                  {parada ? (
                    <Etiqueta clase="b-stop">En parada</Etiqueta>
                  ) : j.estado === 'EN_PROCESO' ? (
                    <Etiqueta clase="b-run">En proceso</Etiqueta>
                  ) : (
                    <Etiqueta clase="b-pend">Pendiente</Etiqueta>
                  )}
                </span>
                <span className="bus">{j.codigoBus}</span>
                <span className="muted">
                  {j.modelo} · {j.linea} · {j.estacion}
                </span>
                {j.estado === 'EN_PROCESO' ? (
                  <span className="t">
                    {hms(msLaborales(new Date(j.horaInicio), ahora, j.jornada))}
                  </span>
                ) : (
                  <span className="muted" style={{ marginTop: 'auto' }}>
                    Pendiente: {ETIQUETA_ESTADO[j.estado].toLowerCase()}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="empty">
          <p style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px', color: 'var(--ink)' }}>
            No hay trabajos en curso
          </p>
          Elige el bus y la estación para empezar a contar el tiempo.
        </div>
      )}

      <div className="card" style={{ marginTop: 22 }}>
        <h2>Cómo se cuenta el tiempo</h2>
        <dl className="kv">
          <dt>Lunes a viernes</dt>
          <dd>07:00 – 19:50</dd>
          <dt>Sábado</dt>
          <dd>07:00 – 16:00</dd>
          <dt>Domingo</dt>
          <dd>No se cuenta</dd>
          <dt>Almuerzo</dt>
          <dd>11:40 – 12:25, no se cuenta</dd>
        </dl>
        <p className="muted" style={{ margin: '10px 0 0', fontSize: 15 }}>
          Si un trabajo sigue después de las 19:50, el contador se detiene y continúa al día
          siguiente a las 07:00.
        </p>
      </div>
      <BarraAcciones>
        <Link href="/trabajo/nuevo" className="btn btn-xl btn-blue">
          Nuevo trabajo
        </Link>
      </BarraAcciones>
    </div>
  );
}
