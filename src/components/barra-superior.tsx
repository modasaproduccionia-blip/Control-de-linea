'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { Sesion } from '@/server/auth/session';
import { api } from '@/lib/api-client';

export function Logo() {
  return (
    <svg width="38" height="34" viewBox="0 0 38 34" aria-hidden="true">
      <path d="M20 0h18l-7 10H13z" fill="#FFD200" />
      <path d="M8 12h18l-7 10H1z" fill="#1E388F" />
      <path d="M16 24h18l-7 10H9z" fill="#D3141B" />
    </svg>
  );
}

export function BarraSuperior({ sesion }: { sesion: Sesion }) {
  const path = usePathname();
  const router = useRouter();
  const tabs = [
    { href: '/', label: 'Trabajos', activo: path === '/' || path.startsWith('/trabajo') },
    { href: '/indicadores', label: 'Indicadores', activo: path.startsWith('/indicadores') },
    ...(sesion.rol !== 'OPERARIO'
      ? [{ href: '/supervisor', label: 'Registros', activo: path.startsWith('/supervisor') }]
      : []),
  ];
  const salir = async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    router.replace('/login');
    router.refresh();
  };
  return (
    <header className="top">
      <div className="top-in">
        <Link href="/" className="brand">
          <Logo />
          <div>
            <b>Control de Línea</b>
            <small>Línea de acabados</small>
          </div>
        </Link>
        <nav className="tabs" aria-label="Secciones">
          {tabs.map((t) => (
            <Link key={t.href} href={t.href} className="tabbtn" aria-current={t.activo ? 'page' : undefined}>
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="user">
          <span>
            <b>{sesion.nombre}</b> · {sesion.codigo}
          </span>
          <button type="button" className="btn btn-ghost" style={{ minHeight: 44, padding: '0 14px', fontSize: 15 }} onClick={salir}>
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
