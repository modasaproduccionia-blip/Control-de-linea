import { redirect } from 'next/navigation';
import { sesionActual } from '@/server/auth/session';

/** Solo supervisor y administrador (la API también lo verifica en cada endpoint). */
export default async function SupervisorLayout({ children }: { children: React.ReactNode }) {
  const s = await sesionActual();
  if (!s || s.rol === 'OPERARIO') redirect('/');
  return children;
}
