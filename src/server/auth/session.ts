import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { env } from '@/config/env';
import { AppError } from '@/server/errors';

/**
 * Sesión propia en cookie httpOnly firmada (JWT HS256). Capa desacoplada: más adelante se puede
 * reemplazar por Auth.js / Microsoft Entra ID sin tocar servicios ni pantallas.
 */
export const COOKIE_SESION = 'cl_sesion';

export type Rol = 'OPERARIO' | 'SUPERVISOR' | 'ADMIN';

export interface Sesion {
  id: string;
  codigo: string;
  nombre: string;
  rol: Rol;
  lineaId: string | null;
}

const clave = () => new TextEncoder().encode(env().AUTH_SECRET);

export async function firmarSesion(s: Sesion): Promise<{ token: string; maxAge: number }> {
  const maxAge = env().SESSION_MAX_AGE_HOURS * 3600;
  const token = await new SignJWT({ ...s })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(s.id)
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(clave());
  return { token, maxAge };
}

export async function leerSesion(token: string | undefined): Promise<Sesion | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, clave(), { algorithms: ['HS256'] });
    const { id, codigo, nombre, rol, lineaId } = payload as unknown as Sesion;
    if (!id || !rol) return null;
    return { id, codigo, nombre, rol, lineaId: lineaId ?? null };
  } catch {
    return null;
  }
}

export async function sesionActual(): Promise<Sesion | null> {
  const jar = await cookies();
  return leerSesion(jar.get(COOKIE_SESION)?.value);
}

/** Exige sesión (y opcionalmente un rol). Se usa en CADA endpoint, no solo para ocultar botones. */
export async function requerirSesion(roles?: Rol[]): Promise<Sesion> {
  const s = await sesionActual();
  if (!s) throw new AppError('NO_AUTENTICADO', 'Su sesión terminó. Vuelva a ingresar.');
  if (roles && !roles.includes(s.rol))
    throw new AppError('PROHIBIDO', 'No tiene permiso para esta acción.');
  return s;
}
