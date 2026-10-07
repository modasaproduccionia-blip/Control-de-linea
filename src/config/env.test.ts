import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

const base = {
  DATABASE_URL: 'postgresql://app:app@localhost:5432/control_linea',
  AUTH_SECRET: 'x'.repeat(32),
};

describe('parseEnv', () => {
  it('aplica valores por defecto', () => {
    const e = parseEnv(base);
    expect(e.APP_TIMEZONE).toBe('America/Lima');
    expect(e.LOG_LEVEL).toBe('info');
    expect(e.SESSION_MAX_AGE_HOURS).toBe(12);
    expect(e.NODE_ENV).toBe('development');
  });

  it('convierte SESSION_MAX_AGE_HOURS a número', () => {
    expect(parseEnv({ ...base, SESSION_MAX_AGE_HOURS: '8' }).SESSION_MAX_AGE_HOURS).toBe(8);
  });

  it('rechaza una DATABASE_URL que no es PostgreSQL', () => {
    expect(() => parseEnv({ ...base, DATABASE_URL: 'mysql://localhost/db' })).toThrow(
      /DATABASE_URL/,
    );
  });

  it('rechaza un AUTH_SECRET corto y nombra la variable', () => {
    expect(() => parseEnv({ ...base, AUTH_SECRET: 'corto' })).toThrow(/AUTH_SECRET/);
  });

  it('rechaza otra zona horaria', () => {
    expect(() => parseEnv({ ...base, APP_TIMEZONE: 'UTC' })).toThrow(/APP_TIMEZONE/);
  });
});
