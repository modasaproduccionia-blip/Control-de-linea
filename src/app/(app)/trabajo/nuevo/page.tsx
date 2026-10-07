'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { codigoBus, esNumeroBusValido } from '@/domain/codigo-bus';
import { api, nuevaClave } from '@/lib/api-client';
import { hm } from '@/lib/formato';
import { BarraAcciones, Cargando, Pasos, useConfirmar, useToast } from '@/components/ui';

interface Combo {
  modeloId: string;
  modelo: string;
  lineaId: string;
  linea: string;
  horaEstandarMin: number | null;
  estacionId: string;
  estacion: string;
  responsable: string | null;
  tieneActividades: boolean;
}
interface Catalogo {
  clientes: { id: string; nombre: string; sigla: string }[];
  combinaciones: Combo[];
}

const unicos = <T,>(xs: T[], k: (x: T) => string) => [...new Map(xs.map((x) => [k(x), x])).values()];

/** Paso 1: Cliente → Modelo → Línea → Estación → Nº de bus. */
export default function NuevoTrabajo() {
  const router = useRouter();
  const toast = useToast();
  const confirmar = useConfirmar();
  const cat = useQuery({ queryKey: ['catalogo-seleccion'], queryFn: () => api<Catalogo>('/catalogos/seleccion') });

  const [clienteId, setClienteId] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [modeloId, setModeloId] = useState('');
  const [lineaId, setLineaId] = useState('');
  const [estacionId, setEstacionId] = useState('');
  const [numero, setNumero] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const clave = useRef(nuevaClave());

  const combos = useMemo(() => cat.data?.combinaciones ?? [], [cat.data]);
  const cliente = cat.data?.clientes.find((c) => c.id === clienteId);
  const modelos = unicos(combos, (c) => c.modeloId);
  const lineas = unicos(
    combos.filter((c) => c.modeloId === modeloId),
    (c) => c.lineaId,
  );
  // DIFERENCIA vs original: las estaciones se filtran por modelo Y línea (el original solo por modelo).
  const estaciones = combos.filter((c) => c.modeloId === modeloId && c.lineaId === lineaId);
  const combo = estaciones.find((c) => c.estacionId === estacionId);
  const q = busqueda.trim().toLowerCase();
  const clientes = (cat.data?.clientes ?? []).filter(
    (c) => !q || c.nombre.toLowerCase().includes(q) || c.sigla.toLowerCase().includes(q),
  );

  const bloqueo = !combo
    ? ''
    : combo.horaEstandarMin == null
      ? 'La línea no tiene hora estándar configurada. Avise a su supervisor.'
      : !combo.tieneActividades
        ? 'Esta estación no tiene actividades configuradas. Avise a su supervisor.'
        : '';
  const listo = !!cliente && !!combo && esNumeroBusValido(numero) && !bloqueo;
  const codigo = cliente ? codigoBus(cliente.sigla, numero) : numero;

  const elegirModelo = (id: string) => {
    setModeloId(id);
    setEstacionId('');
    const ls = unicos(
      combos.filter((c) => c.modeloId === id),
      (c) => c.lineaId,
    );
    setLineaId(ls.length === 1 ? ls[0]!.lineaId : '');
    setError('');
  };
  const tecla = (v: string) => {
    setError('');
    setNumero((n) => (v === 'C' ? '' : v === 'B' ? n.slice(0, -1) : n.length < 3 ? n + v : n));
  };

  const iniciar = async () => {
    if (!cliente || !combo) return setError('Complete todos los campos');
    if (!esNumeroBusValido(numero)) return setError('Debe ingresar exactamente 3 dígitos. Ejemplo: 001');
    const body = { clienteId, modeloId, lineaId, estacionId, numeroBus: numero };
    try {
      await api('/producciones/validar-inicio', { method: 'POST', body });
    } catch (e) {
      return setError((e as Error).message);
    }
    const ok = await confirmar({
      titulo: '¿Iniciar el trabajo?',
      cuerpo: (
        <>
          Bus <b>{codigo}</b> en {combo.linea} · {combo.estacion}. El tiempo empieza a contar ahora.
        </>
      ),
      ok: 'Iniciar',
    });
    if (!ok) return toast('Registro cancelado', 'in');
    setEnviando(true);
    try {
      const r = await api<{ id: string }>('/producciones/iniciar', {
        method: 'POST',
        body,
        idempotencia: clave.current,
      });
      toast('Tiempo en marcha');
      router.replace(`/trabajo/${r.id}`);
    } catch (e) {
      setError((e as Error).message);
      clave.current = nuevaClave();
      setEnviando(false);
    }
  };

  if (cat.isPending) return <Cargando />;
  if (cat.isError) return <p className="err">{(cat.error as Error).message}</p>;

  return (
    <div className="narrow">
      <Pasos actual={1} />
      <h1>Elige el bus y la estación</h1>
      <p className="lead">Al tocar Iniciar empieza a correr el tiempo.</p>

      <div className="field">
        <div className="lab">
          Cliente <em>{cat.data.clientes.length} clientes</em>
        </div>
        {cliente ? (
          <div className="picked">
            <span>
              {cliente.nombre} <span className="muted">({cliente.sigla})</span>
            </span>
            <button type="button" onClick={() => setClienteId('')}>
              Cambiar
            </button>
          </div>
        ) : (
          <>
            <input
              className="search"
              placeholder="Buscar cliente o sigla"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              autoComplete="off"
              aria-label="Buscar cliente"
            />
            <div className="chips small">
              {clientes.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  className="chip"
                  onClick={() => {
                    setClienteId(c.id);
                    setBusqueda('');
                    setError('');
                  }}
                >
                  {c.nombre}
                </button>
              ))}
              {!clientes.length && <p className="muted">Sin coincidencias</p>}
            </div>
          </>
        )}
      </div>

      <div className="field">
        <div className="lab">Modelo</div>
        <div className="chips">
          {modelos.map((m) => (
            <button
              type="button"
              key={m.modeloId}
              className="chip"
              aria-pressed={m.modeloId === modeloId}
              onClick={() => elegirModelo(m.modeloId)}
            >
              {m.modelo}
            </button>
          ))}
        </div>
      </div>

      {modeloId && (
        <div className="field">
          <div className="lab">Línea</div>
          <div className="chips">
            {lineas.map((l) => (
              <button
                type="button"
                key={l.lineaId}
                className="chip"
                aria-pressed={l.lineaId === lineaId}
                onClick={() => {
                  setLineaId(l.lineaId);
                  setEstacionId('');
                }}
              >
                {l.linea}
              </button>
            ))}
          </div>
        </div>
      )}

      {lineaId && (
        <div className="field">
          <div className="lab">Estación</div>
          <div className="chips">
            {estaciones.map((e) => (
              <button
                type="button"
                key={e.estacionId}
                className="chip"
                aria-pressed={e.estacionId === estacionId}
                onClick={() => {
                  setEstacionId(e.estacionId);
                  setError('');
                }}
              >
                {e.estacion}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="field">
        <div className="lab">
          Número de bus <em>3 dígitos</em>
        </div>
        <div className="busrow">
          <div className="keypad">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
              <button type="button" key={n} onClick={() => tecla(n)}>
                {n}
              </button>
            ))}
            <button type="button" onClick={() => tecla('C')} aria-label="Borrar todo">
              C
            </button>
            <button type="button" onClick={() => tecla('0')}>
              0
            </button>
            <button type="button" onClick={() => tecla('B')} aria-label="Borrar último">
              ⌫
            </button>
          </div>
          <div>
            <div className="code">
              <div className="muted" style={{ fontSize: 15 }}>
                Código de bus
              </div>
              <div className="big" aria-live="polite">
                {cliente ? cliente.sigla : <i>--</i>}
                {numero}
                <i>{'_'.repeat(3 - numero.length)}</i>
              </div>
            </div>
            {combo && (
              <dl className="kv" style={{ marginTop: 14 }}>
                <dt>Responsable</dt>
                <dd>{combo.responsable ?? 'Sin responsable asignado'}</dd>
                <dt>Hora estándar {combo.linea}</dt>
                <dd>{combo.horaEstandarMin == null ? '—' : hm(combo.horaEstandarMin)}</dd>
              </dl>
            )}
            {(error || bloqueo) && (
              <p className="err" role="alert">
                {error || bloqueo}
              </p>
            )}
          </div>
        </div>
      </div>

      <BarraAcciones>
        <Link href="/" className="btn btn-ghost" style={{ flex: '0 0 auto' }}>
          Volver
        </Link>
        <button type="button" className="btn btn-xl btn-blue" disabled={!listo || enviando} onClick={iniciar}>
          {enviando ? 'Iniciando…' : 'Iniciar'}
        </button>
      </BarraAcciones>
    </div>
  );
}
