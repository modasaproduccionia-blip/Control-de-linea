import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import type { Logger } from 'pino';

export type ErrorCode =
  | 'VALIDACION'
  | 'NO_AUTENTICADO'
  | 'PROHIBIDO'
  | 'NO_ENCONTRADO'
  | 'CONFLICTO'
  | 'ESTADO_INVALIDO'
  | 'DUPLICADO'
  | 'ERROR_INTERNO';

const STATUS: Record<ErrorCode, number> = {
  VALIDACION: 400,
  NO_AUTENTICADO: 401,
  PROHIBIDO: 403,
  NO_ENCONTRADO: 404,
  CONFLICTO: 409,
  ESTADO_INVALIDO: 409,
  DUPLICADO: 409,
  ERROR_INTERNO: 500,
};

/** Error de negocio con mensaje apto para mostrar al operario. */
export class AppError extends Error {
  readonly status: number;
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
    this.status = STATUS[code];
  }
}

export interface ErrorBody {
  error: { code: ErrorCode; message: string; details?: unknown };
}

/** Convierte cualquier error en la respuesta uniforme `{ error: { code, message, details? } }`. Nunca expone stack traces. */
export function toErrorResponse(err: unknown, log?: Logger): NextResponse<ErrorBody> {
  if (err instanceof AppError) {
    log?.warn({ code: err.code }, err.message);
    return NextResponse.json(
      { error: { code: err.code, message: err.message, details: err.details } },
      { status: err.status },
    );
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDACION',
          message: 'Datos inválidos',
          details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
      },
      { status: 400 },
    );
  }
  log?.error({ err }, 'Error no controlado');
  return NextResponse.json(
    { error: { code: 'ERROR_INTERNO', message: 'Ocurrió un error. Intente de nuevo.' } },
    { status: 500 },
  );
}
