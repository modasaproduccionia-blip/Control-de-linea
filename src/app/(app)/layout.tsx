import { redirect } from 'next/navigation';
import { BarraSuperior } from '@/components/barra-superior';
import { Providers } from '@/components/ui';
import { sesionActual } from '@/server/auth/session';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sesion = await sesionActual();
  if (!sesion) redirect('/login');
  return (
    <Providers>
      <BarraSuperior sesion={sesion} />
      <main>{children}</main>
    </Providers>
  );
}
