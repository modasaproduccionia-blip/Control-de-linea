import { redirect } from 'next/navigation';
import { sesionActual } from '@/server/auth/session';
import { FormularioLogin } from './formulario';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await sesionActual()) redirect('/');
  return (
    <main>
      <FormularioLogin />
    </main>
  );
}
