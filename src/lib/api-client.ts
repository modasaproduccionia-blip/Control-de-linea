/** Cliente HTTP del navegador para `/api/v1`. Los errores llegan con el mensaje listo para el operario. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function api<T>(
  ruta: string,
  opciones: { method?: string; body?: unknown; idempotencia?: string } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/v1${ruta}`, {
      method: opciones.method ?? 'GET',
      headers: {
        ...(opciones.body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(opciones.idempotencia ? { 'idempotency-key': opciones.idempotencia } : {}),
      },
      body: opciones.body !== undefined ? JSON.stringify(opciones.body) : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new ApiError('Sin conexión. Revise el Wi-Fi e intente de nuevo.', 'SIN_CONEXION', 0);
  }
  if (res.status === 401 && typeof window !== 'undefined' && !ruta.startsWith('/auth/login')) {
    // Sesión vencida: recarga completa hacia el login (fuera de un componente, no hay router).
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = '/login';
  }
  const data = (await res.json().catch(() => ({}))) as {
    error?: { code: string; message: string };
  };
  if (!res.ok) {
    throw new ApiError(
      data.error?.message ?? 'Ocurrió un error. Intente de nuevo.',
      data.error?.code ?? 'ERROR',
      res.status,
    );
  }
  return data as T;
}

export const nuevaClave = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
