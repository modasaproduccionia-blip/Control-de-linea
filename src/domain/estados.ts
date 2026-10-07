/** Estados de la producción (PROMPT_MAESTRO §6). Las transiciones solo las ejecuta el backend. */
export type Estado =
  | 'EN_PROCESO'
  | 'PENDIENTE_ACTIVIDADES'
  | 'PENDIENTE_INCIDENCIAS_TIEMPO'
  | 'PENDIENTE_CAUSAS'
  | 'COMPLETADO'
  | 'ANULADO';

/** §5.7: siguiente paso tras registrar actividades. */
export function estadoTrasActividades(sobretiempoMin: number, minutosNoCumplidos: number): Estado {
  if (sobretiempoMin > 0) return 'PENDIENTE_INCIDENCIAS_TIEMPO';
  if (minutosNoCumplidos > 0) return 'PENDIENTE_CAUSAS';
  return 'COMPLETADO';
}

export function estadoTrasIncidencias(minutosNoCumplidos: number): Estado {
  return minutosNoCumplidos > 0 ? 'PENDIENTE_CAUSAS' : 'COMPLETADO';
}

/** Trabajos que aparecen en "Trabajos en curso" y se pueden retomar. */
export function estaPendiente(estado: Estado): boolean {
  return estado !== 'COMPLETADO' && estado !== 'ANULADO';
}

export const ETIQUETA_ESTADO: Record<Estado, string> = {
  EN_PROCESO: 'En proceso',
  PENDIENTE_ACTIVIDADES: 'Registrar actividades',
  PENDIENTE_INCIDENCIAS_TIEMPO: 'Motivos de sobretiempo',
  PENDIENTE_CAUSAS: 'Causas de incumplimiento',
  COMPLETADO: 'Completado',
  ANULADO: 'Anulado',
};
