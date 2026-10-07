import { NextResponse } from 'next/server';
import { env } from '@/config/env';
import { loginSchema } from '@/lib/schemas';
import { leerJson } from '@/server/api';
import { autenticar } from '@/server/auth/login';
import { COOKIE_SESION, firmarSesion } from '@/server/auth/session';
import { toErrorResponse } from '@/server/errors';
import { requestLogger } from '@/server/logger';

export async function POST(req: Request) {
  const { log } = requestLogger(req.headers);
  try {
    const { codigo, pin } = loginSchema.parse(await leerJson(req));
    const sesion = await autenticar(codigo, pin);
    const { token, maxAge } = await firmarSesion(sesion);
    log.info({ usuario: sesion.codigo }, 'login');
    const res = NextResponse.json({ usuario: sesion });
    res.cookies.set(COOKIE_SESION, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env().NODE_ENV === 'production' && (env().AUTH_URL ?? '').startsWith('https'),
      path: '/',
      maxAge,
    });
    return res;
  } catch (err) {
    return toErrorResponse(err, log);
  }
}
