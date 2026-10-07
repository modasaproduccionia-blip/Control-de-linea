import { z } from 'zod';

/**
 * Variables de entorno validadas al arrancar. Si falta algo o tiene formato inválido,
 * la app no arranca y el error dice exactamente qué variable revisar.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET debe tener al menos 32 caracteres'),
  AUTH_URL: z.url().optional(),
  APP_TIMEZONE: z.literal('America/Lima').default('America/Lima'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  SESSION_MAX_AGE_HOURS: z.coerce.number().int().min(1).max(24).default(12),
  AUTH_MICROSOFT_ENTRA_ID_ID: z.string().optional(),
  AUTH_MICROSOFT_ENTRA_ID_SECRET: z.string().optional(),
  AUTH_MICROSOFT_ENTRA_ID_ISSUER: z.url().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const detalle = result.error.issues
      .map((i) => `  - ${i.path.join('.') || '(raíz)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Variables de entorno inválidas:\n${detalle}`);
  }
  return result.data;
}

let cached: Env | undefined;

/** Lectura perezosa: no rompe `next build` cuando aún no hay variables de runtime. */
export function env(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
