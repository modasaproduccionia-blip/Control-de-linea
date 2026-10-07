import { roundHAZ } from './redondeo';

export const MSG_MOTIVOS_REPETIDOS = 'No se pueden registrar motivos repetidos';
export const MSG_SUMA_100 = 'Los porcentajes deben sumar 100%';
export const MSG_FILA_INCOMPLETA = 'Cada fila necesita un motivo y un porcentaje';

export interface FilaIncidencia {
  motivoId: string;
  porcentaje: number;
}

/**
 * PROMPT_MAESTRO §5.8. Devuelve el primer error en el orden del original
 * (repetidos → suma), más la validación de filas vacías (DIFERENCIA vs original, aprobada).
 */
export function validarIncidencias(filas: FilaIncidencia[]): string | null {
  if (filas.length === 0 || filas.some((f) => !f.motivoId || !(f.porcentaje > 0))) {
    return MSG_FILA_INCOMPLETA;
  }
  if (filas.some((f) => !Number.isInteger(f.porcentaje) || f.porcentaje % 5 !== 0 || f.porcentaje > 100)) {
    return 'Los porcentajes deben ser múltiplos de 5 entre 5% y 100%';
  }
  if (new Set(filas.map((f) => f.motivoId)).size !== filas.length) return MSG_MOTIVOS_REPETIDOS;
  if (filas.reduce((s, f) => s + f.porcentaje, 0) !== 100) return MSG_SUMA_100;
  return null;
}

/** TiempoImpacto = porcentaje/100 × sobretiempo, 2 decimales. */
export function tiempoImpactoMin(porcentaje: number, sobretiempoMin: number): number {
  return roundHAZ((porcentaje / 100) * sobretiempoMin, 2);
}

/**
 * "X h Y min". DIFERENCIA vs original (aprobada): se redondea primero y luego se separa,
 * para no mostrar "0 h 0 min" con 59,6 min.
 */
export function formatoHorasMin(minutos: number): string {
  const total = roundHAZ(minutos, 0);
  return `${Math.trunc(total / 60)} h ${total % 60} min`;
}
