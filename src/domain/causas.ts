import { roundHAZ } from './redondeo';

export const MSG_CAUSAS_REPETIDAS = 'No se pueden registrar causas repetidas';
export const MSG_SIN_CAUSAS = 'No hay causas para guardar';

/** Peso lineal decreciente por posición: (N − s + 1) / (N·(N+1)/2). */
export function pesosCausas(n: number): number[] {
  const total = (n * (n + 1)) / 2;
  return Array.from({ length: n }, (_, i) => (n - i) / total);
}

export interface CausaCalculada {
  ordenImportancia: number;
  pesoAsignado: number;
  minutosImpacto: number;
}

/**
 * PROMPT_MAESTRO §5.9 (fórmula de SCR_CAUSAS). Reproduce el redondeo original:
 * la suma de minutosImpacto puede no coincidir exactamente con minutosNoCumplidos.
 */
export function calcularCausas(n: number, minutosNoCumplidos: number): CausaCalculada[] {
  return pesosCausas(n).map((peso, i) => {
    const pesoAsignado = roundHAZ(peso * 100, 0);
    const factor = pesoAsignado > 1 ? pesoAsignado / 100 : peso;
    return {
      ordenImportancia: i + 1,
      pesoAsignado,
      minutosImpacto: roundHAZ(minutosNoCumplidos * factor, 0),
    };
  });
}

export function validarCausas(motivoIds: string[]): string | null {
  if (motivoIds.length === 0) return MSG_SIN_CAUSAS;
  if (motivoIds.some((m) => !m)) return 'Elige una causa en cada fila';
  if (new Set(motivoIds).size !== motivoIds.length) return MSG_CAUSAS_REPETIDAS;
  return null;
}
