'use client';

import Link from 'next/link';
import { hm } from '@/lib/formato';
import type { ProduccionDTO } from '@/server/services/produccion';
import { BarraAcciones } from '@/components/ui';

/** Cierre: "Registro completado" con resumen. También se ve un trabajo ANULADO. */
export function Completado({ p }: { p: ProduccionDTO }) {
  const anulado = p.estado === 'ANULADO';
  return (
    <div className="narrow">
      <div className="stage">
        <div className={`band ${anulado ? 'paused' : ''}`}>
          <div className="timer-lab">{anulado ? 'Registro anulado' : 'Registro completado'}</div>
          <div className="timer" style={{ fontSize: 'clamp(56px,12vw,104px)' }}>
            {p.codigoBus}
          </div>
          <div className="timer-lab">
            {p.modelo} · {p.linea} · {p.estacion}
          </div>
        </div>
        <div style={{ padding: 20 }}>
          <div className="sum">
            <div>
              <b>{hm(p.duracionLaboralMin)}</b>
              <span>Duración laboral</span>
            </div>
            <div>
              <b style={{ color: p.cumpleTiempo ? 'var(--blue)' : 'var(--red)' }}>{p.cumpleTiempo ? 'Sí' : 'No'}</b>
              <span>Cumple tiempo</span>
            </div>
            <div>
              <b>{p.avancePct ?? 0}%</b>
              <span>Avance</span>
            </div>
            <div>
              <b>{p.paradas.length}</b>
              <span>Paradas ({hm(p.minutosParada)})</span>
            </div>
          </div>
        </div>
      </div>
      <BarraAcciones>
        <Link href="/indicadores" className="btn btn-ghost">
          Ver indicadores
        </Link>
        <Link href="/trabajo/nuevo" className="btn btn-xl btn-blue">
          Nuevo trabajo
        </Link>
      </BarraAcciones>
    </div>
  );
}
