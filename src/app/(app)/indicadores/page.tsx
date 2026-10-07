'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { roundHAZ } from '@/domain/redondeo';
import { api } from '@/lib/api-client';
import { diaMes, hm, hoyLima } from '@/lib/formato';
import type { IndicadoresDTO } from '@/server/services/indicadores';
import { Cargando, Etiqueta } from '@/components/ui';

interface Opciones {
  lineas: { id: string; codigo: string }[];
  modelos: { id: string; codigo: string }[];
  estaciones: { id: string; codigo: string; lineaId: string; linea: string }[];
  clientes: { id: string; nombre: string }[];
}
type Periodo = 'hoy' | '7' | '14' | '30' | 'rango';
interface Filtros {
  periodo: Periodo;
  desde: string;
  hasta: string;
  lineaId: string;
  modeloId: string;
  estacionId: string;
  clienteId: string;
}

const horas = (min: number) => `${roundHAZ(min / 60, 1)} h`;

function rangoFechas(f: Filtros): { desde: string; hasta: string } {
  if (f.periodo === 'rango') return { desde: f.desde, hasta: f.hasta };
  if (f.periodo === 'hoy') return { desde: hoyLima(), hasta: hoyLima() };
  return { desde: hoyLima(-(Number(f.periodo) - 1)), hasta: hoyLima() };
}

/** Panel interactivo (§4.9): filtros, KPIs, clic en una estación = filtrar. Se actualiza cada 60 s. */
export default function Indicadores() {
  const [f, setF] = useState<Filtros>({
    periodo: '14',
    desde: hoyLima(-13),
    hasta: hoyLima(),
    lineaId: '',
    modeloId: '',
    estacionId: '',
    clienteId: '',
  });
  const set = (cambio: Partial<Filtros>) => setF((x) => ({ ...x, ...cambio }));
  const rango = rangoFechas(f);
  const qs = new URLSearchParams(
    Object.entries({
      ...rango,
      lineaId: f.lineaId,
      modeloId: f.modeloId,
      estacionId: f.estacionId,
      clienteId: f.clienteId,
    }).filter(([, v]) => v),
  ).toString();

  const op = useQuery({
    queryKey: ['opciones-filtros'],
    queryFn: () => api<Opciones>('/indicadores/opciones'),
    staleTime: 600_000,
  });
  const q = useQuery({
    queryKey: ['indicadores', qs],
    queryFn: () => api<IndicadoresDTO>(`/indicadores?${qs}`),
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
  });

  const lineaForzada = q.data?.lineaForzada ?? null;
  const lineaEfectiva = lineaForzada ?? f.lineaId;
  const estaciones = (op.data?.estaciones ?? []).filter(
    (e) => !lineaEfectiva || e.lineaId === lineaEfectiva,
  );
  const estSel = op.data?.estaciones.find((e) => e.id === f.estacionId);
  const hayFiltros = f.lineaId || f.modeloId || f.estacionId || f.clienteId;

  return (
    <div>
      <h1>Indicadores de la línea</h1>
      <p className="lead">
        Toca una estación para filtrar. Se actualiza solo cada minuto.
        {q.data && q.data.kpis.demo > 0 && (
          <>
            {' '}
            <span className="pill-demo">Incluye {q.data.kpis.demo} registros de demostración</span>
          </>
        )}
      </p>

      <div className="filters" role="group" aria-label="Filtros">
        <select
          aria-label="Periodo"
          value={f.periodo}
          onChange={(e) => set({ periodo: e.target.value as Periodo })}
        >
          <option value="hoy">Hoy</option>
          <option value="7">Últimos 7 días</option>
          <option value="14">Últimos 14 días</option>
          <option value="30">Últimos 30 días</option>
          <option value="rango">Rango…</option>
        </select>
        {f.periodo === 'rango' && (
          <>
            <input
              type="date"
              aria-label="Desde"
              value={f.desde}
              max={f.hasta}
              onChange={(e) => set({ desde: e.target.value })}
            />
            <input
              type="date"
              aria-label="Hasta"
              value={f.hasta}
              min={f.desde}
              onChange={(e) => set({ hasta: e.target.value })}
            />
          </>
        )}
        {!lineaForzada && (
          <select
            aria-label="Línea"
            value={f.lineaId}
            onChange={(e) => set({ lineaId: e.target.value, estacionId: '' })}
          >
            <option value="">Línea: todas</option>
            {op.data?.lineas.map((l) => (
              <option key={l.id} value={l.id}>
                {l.codigo}
              </option>
            ))}
          </select>
        )}
        <select
          aria-label="Modelo"
          value={f.modeloId}
          onChange={(e) => set({ modeloId: e.target.value })}
        >
          <option value="">Modelo: todos</option>
          {op.data?.modelos.map((m) => (
            <option key={m.id} value={m.id}>
              {m.codigo}
            </option>
          ))}
        </select>
        <select
          aria-label="Estación"
          value={f.estacionId}
          onChange={(e) => set({ estacionId: e.target.value })}
        >
          <option value="">Estación: todas</option>
          {estaciones.map((e) => (
            <option key={e.id} value={e.id}>
              {e.linea} · {e.codigo}
            </option>
          ))}
        </select>
        <select
          aria-label="Cliente"
          value={f.clienteId}
          onChange={(e) => set({ clienteId: e.target.value })}
        >
          <option value="">Cliente: todos</option>
          {op.data?.clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
        {estSel && (
          <button type="button" className="clear" onClick={() => set({ estacionId: '' })}>
            Estación {estSel.linea} · {estSel.codigo} ✕
          </button>
        )}
        {hayFiltros && !estSel && (
          <button
            type="button"
            className="clear"
            onClick={() => set({ lineaId: '', modeloId: '', estacionId: '', clienteId: '' })}
          >
            Quitar filtros ✕
          </button>
        )}
      </div>

      {q.isPending ? (
        <Cargando />
      ) : q.isError ? (
        <p className="err">{(q.error as Error).message}</p>
      ) : (
        <Panel
          d={q.data}
          estacionId={f.estacionId}
          filtrarEstacion={(id) => set({ estacionId: f.estacionId === id ? '' : id })}
        />
      )}
    </div>
  );
}

function Panel({
  d,
  estacionId,
  filtrarEstacion,
}: {
  d: IndicadoresDTO;
  estacionId: string;
  filtrarEstacion: (id: string) => void;
}) {
  const k = d.kpis;
  const cumplePct = k.trabajos ? Math.round((k.cumplen / k.trabajos) * 100) : 0;
  const maxE = Math.max(1, ...d.porEstacion.map((e) => e.si + e.no));
  const pieza = d.paradasTipo.find((t) => t.tipo === 'PIEZA')?.minutos ?? 0;
  const material = d.paradasTipo.find((t) => t.tipo === 'MATERIAL')?.minutos ?? 0;
  const totalPar = pieza + material;
  const maxD = Math.max(1, ...d.paradasDetalle.map((x) => x.minutos));
  const enVivo = d.enVivo.reduce((s, l) => s + l.en_proceso, 0);
  const enParada = d.enVivo.reduce((s, l) => s + l.en_parada, 0);

  return (
    <>
      <div className="kpis">
        <div className="kpi">
          <b>{k.trabajos}</b>
          <span>Trabajos finalizados</span>
        </div>
        <div className="kpi blue">
          <b>{cumplePct}%</b>
          <span>Cumplen tiempo</span>
        </div>
        <div className="kpi red">
          <b>{horas(k.sobretiempo_min)}</b>
          <span>Sobretiempo</span>
        </div>
        <div className="kpi">
          <b>{k.avance_prom == null ? '—' : `${roundHAZ(k.avance_prom, 1)}%`}</b>
          <span>Avance promedio</span>
        </div>
        <div className="kpi yel">
          <b>{horas(k.parada_min)}</b>
          <span>En paradas</span>
        </div>
      </div>
      <p className="muted" style={{ margin: '-6px 0 14px', fontSize: 15 }}>
        Ahora en planta: <b>{enVivo}</b> trabajos en curso
        {enParada > 0 && (
          <>
            , <b>{enParada}</b> en parada
          </>
        )}
        {d.enVivo.length > 0 &&
          ` (${d.enVivo.map((l) => `${l.linea}: ${l.en_proceso}`).join(' · ')})`}
        .
      </p>

      <div className="grid2">
        <div className="card">
          <h2>Cumplimiento por estación</h2>
          <div className="legend">
            <span>
              <i style={{ background: 'var(--blue)' }} />
              Cumple
            </span>
            <span>
              <i style={{ background: 'var(--red)' }} />
              No cumple
            </span>
          </div>
          <div className="hbars">
            {d.porEstacion.map((e) => {
              const total = e.si + e.no;
              return (
                <button
                  type="button"
                  key={e.estacion_id}
                  className="hbar"
                  aria-pressed={estacionId === e.estacion_id}
                  onClick={() => filtrarEstacion(e.estacion_id)}
                  title={`${e.linea} · ${e.estacion}: ${e.si} cumplen, ${e.no} no cumplen`}
                >
                  <span className="lbl">
                    {e.linea} · {e.estacion}
                  </span>
                  <span className="trk" style={{ gap: e.si && e.no ? 2 : 0 }}>
                    <span className="seg1" style={{ width: `${(e.si / maxE) * 100}%` }} />
                    <span className="seg2" style={{ width: `${(e.no / maxE) * 100}%` }} />
                  </span>
                  <span className="val">{Math.round((e.si / total) * 100)}%</span>
                </button>
              );
            })}
            {!d.porEstacion.length && <p className="muted">Sin datos para estos filtros.</p>}
          </div>
        </div>
        <div className="card">
          <h2>Paradas: pieza o material</h2>
          {totalPar ? (
            <>
              <div
                className="split"
                role="img"
                aria-label={`Pieza ${hm(pieza)}, material ${hm(material)}`}
              >
                {pieza > 0 && (
                  <div
                    style={{
                      width: `${(pieza / totalPar) * 100}%`,
                      background: 'var(--yellow)',
                      color: 'var(--on-yellow)',
                    }}
                  >
                    Pieza {Math.round((pieza / totalPar) * 100)}%
                  </div>
                )}
                {material > 0 && (
                  <div
                    style={{
                      width: `${(material / totalPar) * 100}%`,
                      background: 'var(--ink-2)',
                      color: 'var(--surface)',
                    }}
                  >
                    Material {Math.round((material / totalPar) * 100)}%
                  </div>
                )}
              </div>
              <div className="hbars">
                {d.paradasDetalle.map((x) => (
                  <div className="hbar stack" key={`${x.tipo}-${x.detalle}`}>
                    <span className="lbl">{x.detalle}</span>
                    <span className="val">
                      {hm(x.minutos)} · {x.cantidad}
                    </span>
                    <span className="trk">
                      <span
                        className="segy"
                        style={{
                          width: `${(x.minutos / maxD) * 100}%`,
                          ...(x.tipo === 'MATERIAL' ? { background: 'var(--ink-2)' } : {}),
                        }}
                      />
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="muted">Sin paradas en este periodo.</p>
          )}
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h2>Horas de sobretiempo y de parada por día</h2>
          <Tendencia datos={d.tendencia} />
        </div>
        <div className="card">
          <h2>Motivos de sobretiempo</h2>
          <Pareto
            filas={d.paretoTiempo}
            clase="seg2"
            vacio="Sin motivos de sobretiempo en este periodo."
          />
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h2>Causas de incumplimiento</h2>
          <Pareto
            filas={d.paretoCausas}
            clase="seg1"
            vacio="Sin causas registradas en este periodo."
          />
        </div>
        <div className="card">
          <h2>Últimos registros</h2>
          <div className="tscroll">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Bus</th>
                  <th>Estación</th>
                  <th>Duración</th>
                  <th>Sobret.</th>
                  <th>Avance</th>
                  <th>Cumple</th>
                </tr>
              </thead>
              <tbody>
                {d.ultimos.map((r) => (
                  <tr key={r.id}>
                    <td>{diaMes(r.fecha)}</td>
                    <td>
                      {r.es_demo ? (
                        <b>{r.codigo_bus}</b>
                      ) : (
                        <Link href={`/trabajo/${r.id}`}>
                          <b>{r.codigo_bus}</b>
                        </Link>
                      )}
                    </td>
                    <td>
                      {r.linea} · {r.estacion}
                    </td>
                    <td>{hm(r.duracion_laboral_min)}</td>
                    <td>{hm(r.sobretiempo_min)}</td>
                    <td>{r.avance_pct == null ? '—' : `${r.avance_pct}%`}</td>
                    <td>
                      <Etiqueta clase={r.cumple ? 'b-ok' : 'b-no'}>
                        {r.cumple ? 'Sí' : 'No'}
                      </Etiqueta>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!d.ultimos.length && <p className="muted">Sin registros.</p>}
          </div>
        </div>
      </div>
    </>
  );
}

function Pareto({
  filas,
  clase,
  vacio,
}: {
  filas: { motivo: string; minutos: number; veces: number }[];
  clase: string;
  vacio: string;
}) {
  const max = Math.max(1, ...filas.map((f) => f.minutos));
  if (!filas.length) return <p className="muted">{vacio}</p>;
  return (
    <div className="hbars">
      {filas.map((f) => (
        <div className="hbar stack" key={f.motivo}>
          <span className="lbl">{f.motivo}</span>
          <span className="val">
            {hm(f.minutos)} · {f.veces} {f.veces === 1 ? 'vez' : 'veces'}
          </span>
          <span className="trk">
            <span className={clase} style={{ width: `${(f.minutos / max) * 100}%` }} />
          </span>
        </div>
      ))}
    </div>
  );
}

/** Dos series (sobretiempo y paradas, en horas) con el mismo eje; tooltip al pasar o tocar un día. */
function Tendencia({ datos }: { datos: IndicadoresDTO['tendencia'] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!datos.length) return <p className="muted">Sin datos para estos filtros.</p>;
  const W = 600;
  const H = 210;
  const p = 30;
  const serie = datos.map((t) => ({
    fecha: t.fecha,
    sob: t.sobretiempo_min / 60,
    par: t.parada_min / 60,
    n: t.trabajos,
  }));
  const mx = Math.max(1, ...serie.map((t) => Math.max(t.sob, t.par)));
  const x = (i: number) =>
    serie.length === 1 ? W / 2 : p + (i * (W - 2 * p)) / (serie.length - 1);
  const y = (v: number) => H - p - (v / mx) * (H - 2 * p);
  const paso = Math.ceil(serie.length / 7);
  const linea = (k: 'sob' | 'par', color: string) => (
    <>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        points={serie.map((t, i) => `${x(i)},${y(t[k])}`).join(' ')}
      />
      {serie.map((t, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(t[k])}
          r={hover === i ? 5 : 4}
          fill={color}
          stroke="var(--surface)"
          strokeWidth={2}
        />
      ))}
    </>
  );
  const h = hover != null ? serie[hover] : null;
  return (
    <>
      <div className="legend">
        <span>
          <i style={{ background: 'var(--red)' }} />
          Sobretiempo
        </span>
        <span>
          <i style={{ background: 'var(--yellow)' }} />
          Paradas
        </span>
        {h && (
          <span style={{ marginLeft: 'auto', color: 'var(--ink)' }}>
            <b>{diaMes(h.fecha)}</b>: sobretiempo {roundHAZ(h.sob, 1)} h · paradas{' '}
            {roundHAZ(h.par, 1)} h · {h.n} trabajos
          </span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label="Tendencia diaria de horas de sobretiempo y de parada"
      >
        <line x1={p} x2={W - p} y1={H - p} y2={H - p} stroke="var(--line)" />
        <line x1={p} x2={W - p} y1={p} y2={p} stroke="var(--line)" strokeDasharray="3 4" />
        <text x={p} y={p - 8}>
          {roundHAZ(mx, 1)} h
        </text>
        {serie.map((t, i) =>
          i % paso === 0 ? (
            <text key={t.fecha} x={x(i)} y={H - 8} textAnchor="middle">
              {diaMes(t.fecha)}
            </text>
          ) : null,
        )}
        {hover != null && (
          <line x1={x(hover)} x2={x(hover)} y1={p} y2={H - p} stroke="var(--line-2)" />
        )}
        {linea('par', 'var(--yellow)')}
        {linea('sob', 'var(--red)')}
        {serie.map((t, i) => {
          const ancho = serie.length === 1 ? W : (W - 2 * p) / (serie.length - 1);
          return (
            <rect
              key={t.fecha}
              x={x(i) - ancho / 2}
              y={0}
              width={ancho}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => setHover(i)}
            >
              <title>
                {diaMes(t.fecha)}: sobretiempo {roundHAZ(t.sob, 1)} h, paradas {roundHAZ(t.par, 1)}{' '}
                h
              </title>
            </rect>
          );
        })}
      </svg>
    </>
  );
}
