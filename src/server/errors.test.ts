import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AppError, toErrorResponse } from './errors';

describe('toErrorResponse', () => {
  it('mapea AppError a su código HTTP y mensaje', async () => {
    const res = toErrorResponse(
      new AppError('DUPLICADO', 'Este Código Bus ya fue registrado en esta estación.'),
    );
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: { code: 'DUPLICADO', message: 'Este Código Bus ya fue registrado en esta estación.' },
    });
  });

  it('mapea ZodError a 400 con detalle por campo', async () => {
    const r = z.object({ numeroBus: z.string().regex(/^\d{3}$/) }).safeParse({ numeroBus: '12' });
    const res = toErrorResponse(r.error);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDACION');
    expect(body.error.details[0].path).toBe('numeroBus');
  });

  it('oculta el detalle de errores inesperados', async () => {
    const res = toErrorResponse(new Error('connection refused at 10.0.0.5'));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('10.0.0.5');
  });
});
