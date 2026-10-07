/**
 * Redondeo "half away from zero", igual que `Round` de Power Fx.
 * Usa notación exponencial para evitar errores de coma flotante (1.005 → 1.01, no 1.00).
 */
export function roundHalfAwayFromZero(valor: number, decimales = 0): number {
  if (!Number.isFinite(valor)) return valor;
  const signo = valor < 0 ? -1 : 1;
  const escalado = Math.round(Number(`${Math.abs(valor)}e${decimales}`));
  const resultado = Number(`${escalado}e${-decimales}`);
  return resultado === 0 ? 0 : signo * resultado;
}

/** Alias corto usado en todas las reglas. */
export const roundHAZ = roundHalfAwayFromZero;
