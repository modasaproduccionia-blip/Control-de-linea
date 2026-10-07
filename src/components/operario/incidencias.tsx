'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { formatoHorasMin, validarIncidencias } from '@/domain/incidencias';
import { roundHAZ } from '@/domain/redondeo';
import { api } from '@/lib/api-client';
import { hm } from '@/lib/formato';
import type { ProduccionDTO } from '@/server/services/produccion';
import { BarraAcciones, Pasos, useConfirmar, useToast } from '@/components/ui';

type Motivo = { id: string; nombre: string };
type Fila = { key: number; motivoId: string; porcentaje: number };

/** Paso 4: "CONTROL DE INCIDENCIAS - TIEMPO" — reparto del sobretiempo en motivos que suman 100%. */
export function IncidenciasTiempo({ p, recargar }: { p: ProduccionDTO; recargar: () => void }) {
  const toast = useToast();
  const confirmar = useConfirmar();
  const motivos = useQuery({
    queryKey: ['motivos', 'TIEMPO'],
    queryFn: () => api<{ motivos: Motivo[] }>('/catalogos/motivos?tipo=TIEMPO'),
    staleTime: 600_000,
  });
  const [filas, setFilas] = useState<Fila[]>([{ key: 1, motivoId: '', porcentaje: 0 }]);
  const [enviando, setEnviando] = useState(false);
  const sobre = p.sobretiempoMin ?? 0;
  const suma = filas.reduce((s, f) => s + f.porcentaje, 0);

  const cambiar = (key: number, cambio: Partial<Fila>) =>
    setFilas((fs) => fs.map((f) => (f.key === key ? { ...f, ...cambio } : f)));

  const registrar = async () => {
    const items = filas.map(({ motivoId, porcentaje }) => ({ motivoId, porcentaje }));
    const error = validarIncidencias(items);
    if (error) return toast(error, 'er');
    const ok = await confirmar({
      titulo: '¿Confirmas el registro de incidencias de tiempo?',
      ok: 'Registrar',
    });
    if (!ok) return toast('Registro cancelado', 'in');
    setEnviando(true);
    try {
      await api(`/producciones/${p.id}/incidencias-tiempo`, { method: 'POST', body: { items } });
      toast('Registro enviado'); // DIFERENCIA vs original: el aviso sale después de guardar.
    } catch (e) {
      toast((e as Error).message, 'er');
      setEnviando(false);
    }
    recargar();
  };

  return (
    <div className="narrow">
      <Pasos actual={4} />
      <h1>¿Por qué hubo sobretiempo?</h1>
      <p className="lead">
        Sobretiempo total:{' '}
        <b>
          {roundHAZ(sobre / 60, 2)} hora ({sobre} min)
        </b>
        . Reparte el 100% entre los motivos.
        {(p.minutosParada ?? 0) > 0 && (
          <>
            {' '}
            Este bus tuvo <b>{hm(p.minutosParada)}</b> en paradas.
          </>
        )}
      </p>
      {filas.map((f, i) => (
        <div className="erow" key={f.key}>
          <span className="n">{i + 1}</span>
          <div>
            <select
              aria-label={`Motivo ${i + 1}`}
              value={f.motivoId}
              onChange={(e) => cambiar(f.key, { motivoId: e.target.value })}
            >
              <option value="">Elige un motivo</option>
              {motivos.data?.motivos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
            <div className="sub">
              Valor de tiempo = {formatoHorasMin((f.porcentaje / 100) * sobre)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="stepper">
              <button
                type="button"
                aria-label="Menos 5%"
                onClick={() => cambiar(f.key, { porcentaje: Math.max(0, f.porcentaje - 5) })}
              >
                −
              </button>
              <output>{f.porcentaje}%</output>
              <button
                type="button"
                aria-label="Más 5%"
                onClick={() => cambiar(f.key, { porcentaje: Math.min(100, f.porcentaje + 5) })}
              >
                +
              </button>
            </div>
            <button
              type="button"
              className="icon-btn del"
              aria-label="Eliminar motivo"
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
        onClick={() => setFilas((fs) => [...fs, { key: Date.now(), motivoId: '', porcentaje: 0 }])}
      >
        Agregar motivo
      </button>
      <div className={`total ${suma === 100 ? 'okk' : 'bad'}`}>
        <span>Total repartido</span>
        <span>{suma}%</span>
      </div>
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
