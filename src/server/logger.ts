import { randomUUID } from 'node:crypto';
import pino, { type Logger } from 'pino';

/**
 * Logger estructurado (JSON). Nunca registrar PIN, cookies ni tokens: se redactan.
 * El nivel se lee directo de process.env para que el logger funcione incluso si
 * la validación de env.ts falla (y así poder registrar ese error).
 */
export const logger: Logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: { app: 'control-linea' },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'pin',
      '*.pin',
      'password',
      '*.password',
      'req.headers.cookie',
      'req.headers.authorization',
    ],
    censor: '[REDACTADO]',
  },
});

export const REQUEST_ID_HEADER = 'x-request-id';

/** Logger hijo con requestId; reutiliza el que venga en la cabecera si es válido. */
export function requestLogger(
  headers: Headers,
  base: Logger = logger,
): { log: Logger; requestId: string } {
  const entrante = headers.get(REQUEST_ID_HEADER);
  const requestId = entrante && /^[\w-]{8,64}$/.test(entrante) ? entrante : randomUUID();
  return { log: base.child({ requestId }), requestId };
}
