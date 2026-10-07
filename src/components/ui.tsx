'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useSinConexion } from '@/lib/hooks';

// ---------------------------------------------------------------- Toasts

type TipoToast = 'ok' | 'er' | 'in';
const ToastCtx = createContext<(msg: string, tipo?: TipoToast) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

// ---------------------------------------------------------------- Confirmación (modal propio, no window.confirm)

interface OpcionesConfirmar {
  titulo: string;
  cuerpo?: ReactNode;
  ok: string;
  clase?: 'btn-blue' | 'btn-red' | 'btn-yellow';
}
const ConfirmCtx = createContext<(o: OpcionesConfirmar) => Promise<boolean>>(async () => false);
export const useConfirmar = () => useContext(ConfirmCtx);

export function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 2, refetchOnWindowFocus: true, staleTime: 5_000 },
          mutations: { retry: 0 }, // en POST no se reintenta solo: se usa idempotencia
        },
      }),
  );
  const [toast, setToast] = useState<{ id: number; msg: string; tipo: TipoToast } | null>(null);
  const mostrar = useCallback((msg: string, tipo: TipoToast = 'ok') => {
    const id = Date.now();
    setToast({ id, msg, tipo });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 3000);
  }, []);

  const dlg = useRef<HTMLDialogElement>(null);
  const [conf, setConf] = useState<(OpcionesConfirmar & { resolver: (v: boolean) => void }) | null>(
    null,
  );
  const confirmar = useCallback(
    (o: OpcionesConfirmar) => new Promise<boolean>((resolver) => setConf({ ...o, resolver })),
    [],
  );
  useEffect(() => {
    if (conf && dlg.current && !dlg.current.open) dlg.current.showModal();
  }, [conf]);
  const cerrar = (v: boolean) => {
    dlg.current?.close();
    conf?.resolver(v);
    setConf(null);
  };

  const sinConexion = useSinConexion();

  return (
    <QueryClientProvider client={qc}>
      <ToastCtx.Provider value={mostrar}>
        <ConfirmCtx.Provider value={confirmar}>
          {sinConexion && (
            <div className="offline" role="alert">
              Sin conexión: el tiempo sigue contando, pero no se puede guardar hasta que vuelva el
              Wi-Fi.
            </div>
          )}
          {children}
          <dialog ref={dlg} onCancel={() => cerrar(false)} aria-labelledby="dlg-titulo">
            {conf && (
              <div className="dlg">
                <h2 id="dlg-titulo">{conf.titulo}</h2>
                {conf.cuerpo && <div className="muted">{conf.cuerpo}</div>}
                <div className="acts">
                  <button type="button" className="btn btn-ghost" onClick={() => cerrar(false)}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={`btn ${conf.clase ?? 'btn-blue'}`}
                    onClick={() => cerrar(true)}
                  >
                    {conf.ok}
                  </button>
                </div>
              </div>
            )}
          </dialog>
          {toast && (
            <div className={`toast ${toast.tipo}`} role="status" aria-live="polite">
              {toast.msg}
            </div>
          )}
        </ConfirmCtx.Provider>
      </ToastCtx.Provider>
    </QueryClientProvider>
  );
}

// ---------------------------------------------------------------- Piezas visuales

const PASOS = ['Selección', 'Trabajo', 'Actividades', 'Tiempo', 'Causas'];

/** Indicador de pasos con paralelogramos (motivo gráfico MODASA). */
export function Pasos({ actual }: { actual: number }) {
  return (
    <div className="steps" aria-label="Pasos">
      {PASOS.map((p, i) => (
        <span
          key={p}
          className={`skew ${i + 1 < actual ? 'done' : i + 1 === actual ? 'on' : ''}`}
          aria-current={i + 1 === actual ? 'step' : undefined}
        >
          <span>
            {i + 1}. {p}
          </span>
        </span>
      ))}
    </div>
  );
}

/** Barra inferior fija con los botones principales. */
export function BarraAcciones({ children }: { children: ReactNode }) {
  const [montado, setMontado] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMontado(true), 0);
    return () => clearTimeout(t);
  }, []);
  if (!montado) return null;
  return createPortal(
    <div className="bar-actions">
      <div className="in">{children}</div>
    </div>,
    document.body,
  );
}

export function Etiqueta({ clase, children }: { clase: string; children: ReactNode }) {
  return (
    <span className={`skew badge ${clase}`}>
      <span>{children}</span>
    </span>
  );
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return <div className="loading">{texto}</div>;
}
