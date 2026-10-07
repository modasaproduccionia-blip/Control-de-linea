export const NUMERO_BUS_REGEX = /^\d{3}$/;
export const MSG_NUMERO_BUS = 'Debe ingresar exactamente 3 dígitos. Ejemplo: 001';
export const MSG_DUPLICADO = 'Este Código Bus ya fue registrado en esta estación.';

export function esNumeroBusValido(numero: string): boolean {
  return NUMERO_BUS_REGEX.test(numero.trim());
}

/** Código de bus = sigla del cliente + 3 dígitos (PROMPT_MAESTRO §5.1). */
export function codigoBus(sigla: string, numero: string): string {
  return `${sigla.trim()}${numero.trim()}`;
}
