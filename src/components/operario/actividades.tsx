'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { calcularAvance } from '@/domain/avance';
import { api } from '@/lib/api-client';
import { hm } from '@/lib/formato';
import type { ProduccionDTO } from '@/server/services/produccion';
import { BarraAcciones, Cargando, Pasos, useConfirmar, useToast } from '@/components/ui';

interface Act {
  id: string;
  nombre: string;
  minutos: number;
  esProvisional: boolean;
}

/** Paso 3: checklist de actividades estándar con avance ponderado en vivo. */
export function Actividades({ p, recargar }: { p: ProduccionDTO; recargar: () => void }) {
  const toast = useToast();
  const confirmar = useConfirmar();
  const q = useQuery({
    queryKey: ['actividades', p.id],
    queryFn: () => api<{ actividades: Act[] }>(`/producciones/${p.id}/actividades`),
  });
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState(false);

  if (q.isPending) return <Cargando />;
  if (q.isError) return <p className="err">{(q.error as Error).message}</p>;
  const acts = q.data.actividades;
  // Misma función del servidor: lo que se ve es lo que se guarda.
  const { avancePct } = calcularAvance({
    minutosActividades: acts.map((a) => a.minutos),
    minutosMarcados: acts.filter((a) => marcadas.has(a.id)).map((a) => a.minutos),
    duracionLaboralMin: p.duracionLaboralMin ?? 0,
  });
  const pct = avancePct ?? 0;

  const alternar = (id: string) =>
    setMarcadas((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const registrar = async () => {
    const ok = await confirmar({
      titulo: '¿Confirmas el registro de actividades?',
      cuerpo: `${marcadas.size} de ${acts.length} actividades marcadas · avance ${pct}%.`,
      ok: 'Registrar',
    });
    if (!ok) return toast('Registro cancelado', 'in');
    setEnviando(true);
    try {
      const r = await api<{ estado: string }>(`/producciones/${p.id}/actividades`, {
        method: 'POST',
        body: { realizadas: [...marcadas] },
      });
      if (r.estado === 'COMPLETADO') toast('Registro enviado');
    } catch (e) {
      toast((e as Error).message, 'er');
      setEnviando(false);
    }
    recargar();
  };

  return (
    <div className="narrow">
      <Pasos actual={3} />
      <h1>Marca las actividades realizadas</h1>
      <p className="lead">
        {p.modelo} - {p.linea} - {p.estacion} · bus {p.codigoBus}
      </p>
      <div className="card sticky-sum">
        <div className="sum">
          <div>
            <b>{pct}%</b>
            <span>Avance</span>
          </div>
          <div>
            <b>{hm(p.duracionLaboralMin)}</b>
            <span>Duración laboral</span>
          </div>
          <div>
            <b style={{ color: (p.sobretiempoMin ?? 0) > 0 ? 'var(--red)' : 'inherit' }}>{hm(p.sobretiempoMin)}</b>
            <span>Sobretiempo</span>
          </div>
          <div>
            <b>{hm(p.minutosParada)}</b>
            <span>En paradas</span>
          </div>
        </div>
        <div
          style={{ height: 10, borderRadius: 5, background: 'var(--surface-2)', marginTop: 12, overflow: 'hidden' }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Avance"
        >
          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--blue)' }} />
        </div>
      </div>
      {acts.map((a) => (
        <button
          type="button"
          key={a.id}
          className="check"
          role="checkbox"
          aria-checked={marcadas.has(a.id)}
          onClick={() => alternar(a.id)}
        >
          <span className="box" aria-hidden>
            ✓
          </span>
          <span className="name">{a.nombre}</span>
          <span className="min">{a.minutos} min</span>
        </button>
      ))}
      <BarraAcciones>
        <button type="button" className="btn btn-xl btn-blue" disabled={enviando} onClick={registrar}>
          Registrar actividades
        </button>
      </BarraAcciones>
    </div>
  );
}
