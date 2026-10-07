import { NextResponse } from 'next/server';
import { REQUEST_ID_HEADER, requestLogger } from '@/server/logger';
import { toErrorResponse } from '@/server/errors';
import { requerirSesion, type Rol, type Sesion } from '@/server/auth/session';
import type { Logger } from 'pino';

interface Contexto<P> {
  req: Request;
  params: P;
  sesion: Sesion;
  log: Logger;
}

/**
 * Envoltorio de todos los endpoints: requestId, autenticación/rol, errores uniformes y `no-store`.
 */
export function ruta<P = Record<string, string>>(
  opciones: { roles?: Rol[] },
  handler: (ctx: Contexto<P>) => Promise<unknown>,
) {
  return async (req: Request, segment: { params: Promise<P> }) => {
    const { log, requestId } = requestLogger(req.headers);
    try {
      const sesion = await requerirSesion(opciones.roles);
      const params = (await segment?.params) ?? ({} as P);
      const data = await handler({
        req,
        params,
        sesion,
        log: log.child({ usuario: sesion.codigo }),
      });
      if (data instanceof Response) return data;
      return NextResponse.json(data ?? { ok: true }, {
        headers: { [REQUEST_ID_HEADER]: requestId, 'cache-control': 'no-store' },
      });
    } catch (err) {
      const res = toErrorResponse(err, log);
      res.headers.set(REQUEST_ID_HEADER, requestId);
      return res;
    }
  };
}

export async function leerJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export function idempotencyKey(req: Request): string | null {
  const k = req.headers.get('idempotency-key');
  return k && /^[\w-]{8,100}$/.test(k) ? k : null;
}
