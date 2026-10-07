'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ETIQUETA_ESTADO, type Estado } from '@/domain/estados';
import { api } from '@/lib/api-client';
import { diaMes, hm, hoyLima, reloj } from '@/lib/formato';
import { Cargando, Etiqueta, useToast } from '@/components/ui';

interface Fila {
  id: string;
  fecha: string;
  codigoBus: string;
  cliente: string;
  modelo: string;
  linea: string;
  estacion: string;
  estado: Estado;
  horaInicio: string;
  horaFin: string | null;
  duracionLaboralMin: number | null;
  sobretiempoMin: number | null;
  avancePct: number | null;
  cumpleTiempo: boolean | null;
  motivoAnulacion: string | null;
}

/** Supervisor: listado filtrable, anulación con motivo (permite retrabajo) y exportación a Excel. */
export default function Supervisor() {
  const [f, setF] = useState({
    desde: hoyLima(-30),
    hasta: hoyLima(),
    lineaId: '',
    estado: '',
    codigoBus: '',
  });
  const [anulando, setAnulando] = useState<Fila | null>(null);
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();
  const lineas = useQuery({
    queryKey: ['opciones-filtros'],
    queryFn: () => api<{ lineas: { id: string; codigo: string }[] }>('/indicadores/opciones'),
    staleTime: 600_000,
  });
  const q = useQuery({
    queryKey: ['supervisor', qs],
    queryFn: () => api<{ producciones: Fila[] }>(`/supervisor/producciones?${qs}`),
    placeholderData: keepPreviousData,
  });

  return (
    <div>
      <h1>Registros</h1>
      <p className="lead">
        Consulta, anula registros (por ejemplo, para registrar un retrabajo) y exporta a Excel.
      </p>
      <div className="filters" role="group" aria-label="Filtros">
        <input
          type="date"
          aria-label="Desde"
          value={f.desde}
          onChange={(e) => setF({ ...f, desde: e.target.value })}
        />
        <input
          type="date"
          aria-label="Hasta"
          value={f.hasta}
          onChange={(e) => setF({ ...f, hasta: e.target.value })}
        />
        <select
          aria-label="Línea"
          value={f.lineaId}
          onChange={(e) => setF({ ...f, lineaId: e.target.value })}
        >
          <option value="">Línea: todas</option>
          {lineas.data?.lineas.map((l) => (
            <option key={l.id} value={l.id}>
              {l.codigo}
            </option>
          ))}
        </select>
        <select
          aria-label="Estado"
          value={f.estado}
          onChange={(e) => setF({ ...f, estado: e.target.value })}
        >
          <option value="">Estado: todos</option>
          {Object.entries(ETIQUETA_ESTADO).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <input
          className="search"
          style={{ width: 160, margin: 0, minHeight: 46 }}
          placeholder="Código de bus"
          value={f.codigoBus}
          onChange={(e) => setF({ ...f, codigoBus: e.target.value })}
          aria-label="Código de bus"
        />
        <a
          className="btn btn-blue"
          style={{ minHeight: 46 }}
          href={`/api/v1/exportar/producciones?${qs}`}
        >
          Exportar a Excel
        </a>
      </div>
      {q.isPending ? (
        <Cargando />
      ) : q.isError ? (
        <p className="err">{(q.error as Error).message}</p>
      ) : (
        <div className="card tscroll">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Bus</th>
                <th>Cliente</th>
                <th>Modelo</th>
                <th>Estación</th>
                <th>Inicio – Fin</th>
                <th>Duración</th>
                <th>Sobret.</th>
                <th>Avance</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {q.data.producciones.map((r) => (
                <tr key={r.id}>
                  <td>{diaMes(r.fecha)}</td>
                  <td>
                    <Link href={`/trabajo/${r.id}`}>
                      <b>{r.codigoBus}</b>
                    </Link>
                  </td>
                  <td>{r.cliente}</td>
                  <td>{r.modelo}</td>
                  <td>
                    {r.linea} · {r.estacion}
                  </td>
                  <td>
                    {reloj(r.horaInicio)} – {r.horaFin ? reloj(r.horaFin) : '…'}
                  </td>
                  <td>{r.duracionLaboralMin == null ? '—' : hm(r.duracionLaboralMin)}</td>
                  <td>{r.sobretiempoMin == null ? '—' : hm(r.sobretiempoMin)}</td>
                  <td>{r.avancePct == null ? '—' : `${r.avancePct}%`}</td>
                  <td title={r.motivoAnulacion ?? undefined}>
                    <Etiqueta
                      clase={
                        r.estado === 'ANULADO'
                          ? 'b-no'
                          : r.estado === 'COMPLETADO'
                            ? 'b-ok'
                            : r.estado === 'EN_PROCESO'
                              ? 'b-run'
                              : 'b-pend'
                      }
                    >
                      {ETIQUETA_ESTADO[r.estado]}
                    </Etiqueta>
                  </td>
                  <td>
                    {r.estado !== 'ANULADO' && (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ minHeight: 40, fontSize: 15, color: 'var(--red)' }}
                        onClick={() => setAnulando(r)}
                      >
                        Anular
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!q.data.producciones.length && (
            <p className="muted">Sin registros para estos filtros.</p>
          )}
        </div>
      )}
      {anulando && (
        <ModalAnular
          fila={anulando}
          cerrar={() => setAnulando(null)}
          listo={() => {
            setAnulando(null);
            void q.refetch();
          }}
        />
      )}
    </div>
  );
}

function ModalAnular({
  fila,
  cerrar,
  listo,
}: {
  fila: Fila;
  cerrar: () => void;
  listo: () => void;
}) {
  const toast = useToast();
  const dlg = useRef<HTMLDialogElement>(null);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  useEffect(() => {
    dlg.current?.showModal();
  }, []);
  const anular = async () => {
    setEnviando(true);
    try {
      await api(`/producciones/${fila.id}/anular`, { method: 'POST', body: { motivo } });
      toast('Registro anulado');
      dlg.current?.close();
      listo();
    } catch (e) {
      setError((e as Error).message);
      setEnviando(false);
    }
  };
  return (
    <dialog ref={dlg} onCancel={cerrar} aria-labelledby="anular-titulo">
      <div className="dlg">
        <h2 id="anular-titulo">¿Anular el registro {fila.codigoBus}?</h2>
        <p className="muted">
          {fila.linea} · {fila.estacion}. Queda en auditoría y el bus se podrá registrar de nuevo en
          esta estación.
        </p>
        <label htmlFor="motivo-anular" style={{ fontWeight: 700 }}>
          Motivo
        </label>
        <textarea
          id="motivo-anular"
          maxLength={300}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
        {error && <p className="err">{error}</p>}
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
          <button
            type="button"
            className="btn btn-red"
            disabled={enviando || motivo.trim().length < 5}
            onClick={anular}
          >
            Anular
          </button>
        </div>
      </div>
    </dialog>
  );
}
