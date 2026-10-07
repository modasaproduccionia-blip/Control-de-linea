import { calcularMinutosLaborales, type Jornada } from './jornada';
import { roundHAZ } from './redondeo';

export interface ResultadoCierre {
  duracionRealMin: number;
  /** Minutos laborales reales, sin el mínimo del estándar. */
  minutosLaborales: number;
  /** max(minutosLaborales, estándar) — regla original, confirmada en DECISIONES.md. */
  duracionLaboralMin: number;
  sobretiempoMin: number;
  cumpleTiempo: boolean;
}

/** PROMPT_MAESTRO §5.2–5.4: cálculos al FINALIZAR un trabajo. */
export function calcularCierre(params: {
  horaInicio: Date;
  horaFin: Date;
  horaEstandarMin: number;
  jornada: Jornada;
}): ResultadoCierre {
  const { horaInicio, horaFin, horaEstandarMin, jornada } = params;
  const duracionRealMin = Math.max(0, roundHAZ((+horaFin - +horaInicio) / 60_000, 0));
  const minutosLaborales = roundHAZ(calcularMinutosLaborales(horaInicio, horaFin, jornada), 0);
  const duracionLaboralMin = Math.max(minutosLaborales, horaEstandarMin);
  const sobretiempoMin = Math.max(duracionLaboralMin - horaEstandarMin, 0);
  return {
    duracionRealMin,
    minutosLaborales,
    duracionLaboralMin,
    sobretiempoMin,
    cumpleTiempo: sobretiempoMin <= 0,
  };
}

/** Minutos laborales de una parada (misma regla de jornada, sin el mínimo del estándar). */
export function minutosParada(inicio: Date, fin: Date, jornada: Jornada) {
  return {
    duracionRealMin: Math.max(0, roundHAZ((+fin - +inicio) / 60_000, 0)),
    duracionLaboralMin: roundHAZ(calcularMinutosLaborales(inicio, fin, jornada), 0),
  };
}
