import bcrypt from 'bcryptjs';
import { prisma } from '@/server/db';
import { AppError } from '@/server/errors';
import type { Sesion } from './session';

const MAX_INTENTOS = 5;
const BLOQUEO_MIN = 15;
// Hash para comparar aunque el usuario no exista (mismo tiempo de respuesta).
let hashFalso: string | undefined;
const HASH_FALSO = () => (hashFalso ??= bcrypt.hashSync('usuario-inexistente', 10));

/** Valida código + PIN, con bloqueo temporal tras 5 intentos fallidos (PROMPT_MAESTRO §13). */
export async function autenticar(codigo: string, pin: string, ahora = new Date()): Promise<Sesion> {
  const u = await prisma.usuario.findUnique({ where: { codigo } });
  if (u?.bloqueadoHasta && u.bloqueadoHasta > ahora) {
    const min = Math.ceil((u.bloqueadoHasta.getTime() - ahora.getTime()) / 60_000);
    throw new AppError('PROHIBIDO', `Usuario bloqueado por intentos fallidos. Intente en ${min} min.`);
  }
  const ok = await bcrypt.compare(pin, u?.pinHash ?? HASH_FALSO());
  if (!u || !u.activo || !ok) {
    if (u) {
      const intentos = u.intentosFallidos + 1;
      await prisma.usuario.update({
        where: { id: u.id },
        data:
          intentos >= MAX_INTENTOS
            ? { intentosFallidos: 0, bloqueadoHasta: new Date(ahora.getTime() + BLOQUEO_MIN * 60_000) }
            : { intentosFallidos: intentos },
      });
    }
    throw new AppError('NO_AUTENTICADO', 'Código o PIN incorrecto.');
  }
  if (u.intentosFallidos || u.bloqueadoHasta) {
    await prisma.usuario.update({ where: { id: u.id }, data: { intentosFallidos: 0, bloqueadoHasta: null } });
  }
  return { id: u.id, codigo: u.codigo, nombre: u.nombre, rol: u.rol, lineaId: u.lineaId };
}
