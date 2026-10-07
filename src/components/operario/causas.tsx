'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { calcularCausas, validarCausas } from '@/domain/causas';
import { api } from '@/lib/api-client';
import type { ProduccionDTO } from '@/server/services/produccion';
import { BarraAcciones, Pasos, useConfirmar, useToast } from '@/components/ui';

type Motivo = { id: string; nombre: string };
type Fila = { key: number; motivoId: string };

/** Paso 5: "CONTROL DE INCIDENCIAS PRODUCCIÓN" — causas ordenadas; la posición es la importancia. */
export function Causas({ p, recargar }: { p: ProduccionDTO; recargar: () => void }) {
  const toast = useToast();
  const confirmar = useConfirmar();
  const motivos = useQuery({
    queryKey: ['motivos', 'PRODUCCION'],
    queryFn: () => api<{ motivos: Motivo[] }>('/catalogos/motivos?tipo=PRODUCCION'),
    staleTime: 600_000,
  });
  const [filas, setFilas] = useState<Fila[]>([{ key: 1, motivoId: '' }]);
  const [enviando, setEnviando] = useState(false);
  const minutos = p.minutosNoCumplidos ?? 0;
  const calculo = calcularCausas(filas.length, minutos);

  const mover = (i: number, d: number) =>
    setFilas((fs) => {
      const n = [...fs];
      const [x] = n.splice(i, 1);
      n.splice(i + d, 0, x!);
      return n;
    });

  const registrar = async () => {
    const ids = filas.map((f) => f.motivoId);
    const error = validarCausas(ids);
    if (error) return toast(error, 'er');
    const ok = await confirmar({
      titulo: '¿Confirmas el registro de causas de incumplimiento?',
      ok: 'Registrar',
    });
    if (!ok) return toast('Registro cancelado', 'in');
    setEnviando(true);
    try {
      await api(`/producciones/${p.id}/causas`, {
        method: 'POST',
        body: { items: ids.map((motivoId) => ({ motivoId })) },
      });
      toast('Registro guardado correctamente');
    } catch (e) {
      toast((e as Error).message, 'er');
      setEnviando(false);
    }
    recargar();
  };

  return (
    <div className="narrow">
      <Pasos actual={5} />
      <h1>Se dejaron de ejecutar {minutos} minutos de trabajo</h1>
      <p className="lead">
        ¿Cuáles fueron las principales causas? Ordénalas de la más importante a la menos importante.
      </p>
      {filas.map((f, i) => (
        <div className="erow" key={f.key}>
          <span className="n">{i + 1}</span>
          <div>
            <select
              aria-label={`Causa ${i + 1}`}
              value={f.motivoId}
              onChange={(e) =>
                setFilas((fs) =>
                  fs.map((x) => (x.key === f.key ? { ...x, motivoId: e.target.value } : x)),
                )
              }
            >
              <option value="">Elige una causa</option>
              {motivos.data?.motivos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
            <div className="sub">
              Peso {calculo[i]?.pesoAsignado}% · impacto {calculo[i]?.minutosImpacto} min
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="icon-btn"
              aria-label="Subir"
              disabled={i === 0}
              onClick={() => mover(i, -1)}
            >
              ↑
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label="Bajar"
              disabled={i === filas.length - 1}
              onClick={() => mover(i, 1)}
            >
              ↓
            </button>
            <button
              type="button"
              className="icon-btn del"
              aria-label="Eliminar causa"
              disabled={filas.length < 2}
              onClick={() => setFilas((fs) => fs.filter((x) => x.key !== f.key))}
            >
              ✕
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-ghost"
        style={{ width: '100%', color: 'var(--blue)', borderColor: 'var(--blue)' }}
        onClick={() => setFilas((fs) => [...fs, { key: Date.now(), motivoId: '' }])}
      >
        + Agregar causa
      </button>
      <BarraAcciones>
        <button
          type="button"
          className="btn btn-xl btn-blue"
          disabled={enviando}
          onClick={registrar}
        >
          Registrar
        </button>
      </BarraAcciones>
    </div>
  );
}
