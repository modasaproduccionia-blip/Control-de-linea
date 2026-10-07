import { Writable } from 'node:stream';
import pino from 'pino';
import { describe, expect, it } from 'vitest';
import { requestLogger } from './logger';

function capturar() {
  const lineas: Record<string, unknown>[] = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      lineas.push(JSON.parse(String(chunk)));
      cb();
    },
  });
  return { base: pino({ redact: { paths: ['pin'], censor: '[REDACTADO]' } }, stream), lineas };
}

describe('requestLogger', () => {
  it('reutiliza un x-request-id válido y lo agrega a cada línea', () => {
    const { base, lineas } = capturar();
    const { log, requestId } = requestLogger(new Headers({ 'x-request-id': 'abc-12345678' }), base);
    log.info('hola');
    expect(requestId).toBe('abc-12345678');
    expect(lineas[0]).toMatchObject({ requestId: 'abc-12345678', msg: 'hola' });
  });

  it('genera uno nuevo si la cabecera falta o es inválida', () => {
    const { base } = capturar();
    expect(requestLogger(new Headers(), base).requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(requestLogger(new Headers({ 'x-request-id': 'mal id!' }), base).requestId).not.toBe(
      'mal id!',
    );
  });

  it('redacta el PIN', () => {
    const { base, lineas } = capturar();
    base.info({ pin: '1234' }, 'login');
    expect(lineas[0]?.pin).toBe('[REDACTADO]');
  });
});
