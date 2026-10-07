'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { estadoReloj, msLaborales } from '@/domain/jornada';
import { api, nuevaClave } from '@/lib/api-client';
import { fechaHora, hm, hms, reloj } from '@/lib/formato';
import { useAhora } from '@/lib/hooks';
import type { ProduccionDTO } from '@/server/services/produccion';
import { BarraAcciones, Pasos, useConfirmar, useToast } from '@/components/ui';

type Props = { p: ProduccionDTO; recargar: () => void };

/** Paso 2: contador en vivo (solo tiempo laboral), paradas y FINALIZAR. */
export function Cronometro({ p, recargar }: Props) {
  const toast = useToast();
  const confirmar = useConfirmar();
  const ahora = useAhora(250);
  const [modal, setModal] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const inicio = new Date(p.horaInicio);
  const labMs = msLaborales(inicio, ahora, p.jornada);
  const est = estadoReloj(ahora, p.jornada);
  const labMin = labMs / 60_000;
  const sobre = labMin > p.horaEstandarMin;
  const abierta = p.paradas.find((x) => !x.horaFin);

  const terminarParada = async () => {
    if (!abierta) return;
    const ok = await confirmar({
      titulo: '¿Terminar la parada?',
      cuerpo: `${abierta.detalle} · ${hms(ahora - +new Date(abierta.horaInicio))}`,
      ok: 'Terminar parada',
      clase: 'btn-yellow',
    });
    if (!ok) return;
    setEnviando(true);
    try {
      await api(`/producciones/${p.id}/paradas/${abierta.id}/terminar`, { method: 'POST' });
      toast('Parada cerrada');
    } catch (e) {
      toast((e as Error).message, 'er');
    } finally {
      setEnviando(false);
      recargar();
    }
  };

  const finalizar = async () => {
    if (abierta) return toast('Termina la parada antes de finalizar el trabajo', 'er');
    const ok = await confirmar({
      titulo: '¿Finalizar el trabajo?',
      cuerpo: (
        <>
          Bus <b>{p.codigoBus}</b> en {p.estacion}. Tiempo laboral: <b>{hms(labMs)}</b>.
        </>
      ),
      ok: 'Finalizar',
      clase: 'btn-red',
    });
    if (!ok) return toast('Registro cancelado', 'in');
    setEnviando(true);
    try {
      await api(`/producciones/${p.id}/finalizar`, { method: 'POST' });
    } catch (e) {
      toast((e as Error).message, 'er');
    } finally {
      setEnviando(false);
      recargar();
    }
  };

  return (
    <div className="narrow">
      <Pasos actual={2} />
      <div className="stage">
        <div className="stage-head">
          <div>
            <div className="bus">{p.codigoBus}</div>
            <div className="muted">
              {p.cliente} · {p.modelo} · {p.linea} · {p.estacion}
            </div>
          </div>
          <dl className="kv">
            <dt>Inicio</dt>
            <dd>{fechaHora(p.horaInicio)}</dd>
            <dt>Responsable</dt>
            <dd>{p.responsable ?? 'Sin responsable asignado'}</dd>
          </dl>
        </div>
        <div className={`band ${est.estado === 'CUENTA' ? '' : 'paused'}`}>
          <div className="timer-lab">Tiempo laboral contado</div>
          <div className="timer" role="timer" aria-live="off">
            {hms(labMs)}
          </div>
          <span className={`state skew badge ${est.estado === 'CUENTA' ? 'b-ok' : 'b-pend'}`}>
            <span>{est.mensaje}</span>
          </span>
        </div>
        {abierta && (
          <div className="stopband" role="status">
            <div>
              <div style={{ fontWeight: 700 }}>
                Parada por {abierta.tipo === 'PIEZA' ? 'pieza' : 'material'}
              </div>
              <div>{abierta.detalle}</div>
            </div>
            <div className="st" style={{ marginLeft: 'auto' }}>
              {hms(ahora - +new Date(abierta.horaInicio))}
            </div>
          </div>
        )}
        <div className="meter">
          <div className="track">
            <div
              className={`fill ${sobre ? 'over' : ''}`}
              style={{ width: `${Math.min(100, (labMin / p.horaEstandarMin) * 100)}%` }}
            />
          </div>
          <div className="row">
            <span>
              Estándar {p.linea}: <b>{hm(p.horaEstandarMin)}</b>
            </span>
            {sobre ? (
              <b style={{ color: 'var(--red)' }}>Sobretiempo: {hm(labMin - p.horaEstandarMin)}</b>
            ) : (
              <span>Faltan {hm(p.horaEstandarMin - labMin)} para el estándar</span>
            )}
            <span>
              Tiempo real: <b>{hms(ahora - +inicio)}</b>
            </span>
          </div>
        </div>
      </div>

      {p.paradas.length > 0 && (
        <div className="card" style={{ marginTop: 14 }}>
          <h2>Paradas registradas</h2>
          <ul className="stoplist">
            {p.paradas.map((x) => (
              <li key={x.id}>
                <span>
                  <span className="tag">{x.tipo === 'PIEZA' ? 'Pieza' : 'Material'}</span>{' '}
                  {x.detalle}
                  {x.comentario && <span className="muted"> · {x.comentario}</span>}
                </span>
                <span>
                  {reloj(x.horaInicio)} – {x.horaFin ? reloj(x.horaFin) : 'en curso'} ·{' '}
                  <b>{x.horaFin ? hm(x.duracionLaboralMin) : '…'}</b>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {modal && (
        <ModalParada produccionId={p.id} cerrar={() => setModal(false)} recargar={recargar} />
      )}

      <BarraAcciones>
        {abierta ? (
          <button
            type="button"
            className="btn btn-xl btn-yellow"
            disabled={enviando}
            onClick={terminarParada}
          >
            Terminar parada
          </button>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-xl btn-yellow"
              disabled={enviando}
              onClick={() => setModal(true)}
            >
              Registrar parada
            </button>
            <button
              type="button"
              className="btn btn-xl btn-red"
              disabled={enviando}
              onClick={finalizar}
            >
              Finalizar
            </button>
          </>
        )}
      </BarraAcciones>
    </div>
  );
}

interface Detalle {
  id: string;
  tipo: 'PIEZA' | 'MATERIAL';
  nombre: string;
  requiereComentario: boolean;
}

/** Modal de parada: Pieza / Material → detalle → comentario → INICIAR PARADA (§4.4, §5.12). */
function ModalParada({
  produccionId,
  cerrar,
  recargar,
}: {
  produccionId: string;
  cerrar: () => void;
  recargar: () => void;
}) {
  const toast = useToast();
  const dlg = useRef<HTMLDialogElement>(null);
  const clave = useRef(nuevaClave());
  const det = useQuery({
    queryKey: ['detalles-parada'],
    queryFn: () => api<{ detalles: Detalle[] }>('/catalogos/detalles-parada'),
    staleTime: 600_000,
  });
  const [tipo, setTipo] = useState<'PIEZA' | 'MATERIAL' | null>(null);
  const [detalleId, setDetalleId] = useState('');
  const [comentario, setComentario] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  useEffect(() => {
    dlg.current?.showModal();
  }, []);

  const detalle = det.data?.detalles.find((d) => d.id === detalleId);
  const iniciar = async () => {
    if (!tipo) return setError('Elige si la parada es por pieza o por material');
    if (!detalle) return setError('Elige el detalle de la parada');
    if (detalle.requiereComentario && !comentario.trim())
      return setError('Escribe un comentario para explicar la parada');
    setEnviando(true);
    try {
      await api(`/producciones/${produccionId}/paradas`, {
        method: 'POST',
        body: { tipo, detalleParadaId: detalleId, comentario: comentario.trim() || null },
        idempotencia: clave.current,
      });
      toast('Parada registrada');
      dlg.current?.close();
      cerrar();
      recargar();
    } catch (e) {
      setError((e as Error).message);
      clave.current = nuevaClave();
      setEnviando(false);
    }
  };

  return (
    <dialog ref={dlg} onCancel={cerrar} aria-labelledby="parada-titulo">
      <div className="dlg">
        <h2 id="parada-titulo">Registrar parada</h2>
        <p className="muted" style={{ margin: 0 }}>
          El tiempo del bus sigue corriendo. La parada se registra aparte.
        </p>
        <div className="seg">
          {(['PIEZA', 'MATERIAL'] as const).map((t) => (
            <button
              type="button"
              key={t}
              aria-pressed={tipo === t}
              onClick={() => {
                setTipo(t);
                setDetalleId('');
                setError('');
              }}
            >
              {t === 'PIEZA' ? 'Pieza' : 'Material'}
            </button>
          ))}
        </div>
        {tipo && (
          <div className="field" style={{ marginBottom: 12 }}>
            <div className="lab">Detalle</div>
            <div className="chips small" style={{ gridTemplateColumns: '1fr' }}>
              {det.data?.detalles
                .filter((d) => d.tipo === tipo)
                .map((d) => (
                  <button
                    type="button"
                    key={d.id}
                    className="chip"
                    aria-pressed={d.id === detalleId}
                    onClick={() => {
                      setDetalleId(d.id);
                      setError('');
                    }}
                    style={{ textAlign: 'left' }}
                  >
                    {d.nombre}
                  </button>
                ))}
            </div>
          </div>
        )}
        {tipo && (
          <>
            <label htmlFor="comentario" style={{ fontWeight: 700 }}>
              Comentario {detalle?.requiereComentario ? '(obligatorio)' : '(opcional)'}
            </label>
            <textarea
              id="comentario"
              maxLength={300}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
            />
          </>
        )}
        {error && (
          <p className="err" role="alert">
            {error}
          </p>
        )}
        <div className="acts">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              dlg.current?.close();
              cerrar();
            }}
          >
            Cancelar
          </button>
          <button type="button" className="btn btn-yellow" disabled={enviando} onClick={iniciar}>
            Iniciar parada
          </button>
        </div>
      </div>
    </dialog>
  );
}
