import { roundHAZ } from './redondeo';

/**
 * PROMPT_MAESTRO §5.5–5.6 (fórmulas de SCR_ACTIVIDADES).
 * - avancePct = Σ marcados / Σ total × 100, 1 decimal (null si la estación no tiene actividades).
 * - minutosNoCumplidos = duraciónLaboral × (100 − pct) / 100, entero; pct usa max(Σ total, 1).
 */
export function calcularAvance(params: {
  minutosActividades: number[];
  minutosMarcados: number[];
  duracionLaboralMin: number;
}): { avancePct: number | null; minutosNoCumplidos: number } {
  const total = suma(params.minutosActividades);
  const marcados = suma(params.minutosMarcados);
  const avancePct = total > 0 ? roundHAZ((marcados / total) * 100, 1) : null;
  const pct = roundHAZ((Math.max(marcados, 0) / Math.max(total, 1)) * 100, 1);
  const minutosNoCumplidos = roundHAZ((params.duracionLaboralMin * (100 - pct)) / 100, 0);
  return { avancePct, minutosNoCumplidos };
}

function suma(valores: number[]): number {
  // Suma en centésimas para no acumular error de coma flotante (minutos con 2 decimales).
  return valores.reduce((s, v) => s + Math.round(v * 100), 0) / 100;
}
