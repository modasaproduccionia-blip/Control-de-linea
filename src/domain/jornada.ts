import { TZDate } from '@date-fns/tz';

/**
 * Jornada laboral (PROMPT_MAESTRO §5.3, DECISIONES 2026-10-07).
 * Solo cuenta el tiempo dentro de la ventana de cada día, sin el almuerzo.
 * Todo se evalúa en la zona horaria de la planta (America/Lima).
 */
export const ZONA_HORARIA = 'America/Lima';

export interface VentanaDia {
  entrada: string; // "HH:MM"
  salida: string; // "HH:MM"
}

export interface Jornada {
  /** Clave = día ISO (1 = lunes … 7 = domingo). `null` = no laborable. */
  dias: Record<number, VentanaDia | null>;
  almuerzo: { inicio: string; fin: string };
}

/** Valores confirmados en DECISIONES.md; en BD son editables (`jornada_dia`, `jornada_config`). */
export const JORNADA_POR_DEFECTO: Jornada = {
  dias: {
    1: { entrada: '07:00', salida: '19:50' },
    2: { entrada: '07:00', salida: '19:50' },
    3: { entrada: '07:00', salida: '19:50' },
    4: { entrada: '07:00', salida: '19:50' },
    5: { entrada: '07:00', salida: '19:50' },
    6: { entrada: '07:00', salida: '16:00' },
    7: null,
  },
  almuerzo: { inicio: '11:40', fin: '12:25' },
};

const MS_MIN = 60_000;

function hhmm(valor: string): [number, number] {
  const m = /^(\d{2}):(\d{2})$/.exec(valor);
  if (!m) throw new Error(`Hora inválida: ${valor}`);
  return [Number(m[1]), Number(m[2])];
}

/** Instante (ms) de la hora local "HH:MM" del día local (y, m, d). */
function instante(y: number, m: number, d: number, hora: string, tz: string): number {
  const [h, min] = hhmm(hora);
  return new TZDate(y, m, d, h, min, 0, 0, tz).getTime();
}

function solape(a: number, b: number, c: number, d: number): number {
  return Math.max(0, Math.min(b, d) - Math.max(a, c));
}

function diaIso(fecha: TZDate): number {
  const d = fecha.getDay();
  return d === 0 ? 7 : d;
}

/** Milisegundos laborales entre `inicio` y `fin` (sin aplicar el mínimo del estándar). */
export function msLaborales(
  inicio: Date | number,
  fin: Date | number,
  jornada: Jornada,
  tz: string = ZONA_HORARIA,
): number {
  const a = +inicio;
  const b = +fin;
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;

  let total = 0;
  const primero = new TZDate(a, tz);
  let y = primero.getFullYear();
  let m = primero.getMonth();
  let d = primero.getDate();

  // Recorre día por día (en hora local) hasta pasar el fin.
  for (;;) {
    const inicioDia = new TZDate(y, m, d, 0, 0, 0, 0, tz);
    if (inicioDia.getTime() >= b) break;
    const ventana = jornada.dias[diaIso(inicioDia)];
    if (ventana) {
      const desde = Math.max(a, instante(y, m, d, ventana.entrada, tz));
      const hasta = Math.min(b, instante(y, m, d, ventana.salida, tz));
      if (hasta > desde) {
        const almuerzo = solape(
          desde,
          hasta,
          instante(y, m, d, jornada.almuerzo.inicio, tz),
          instante(y, m, d, jornada.almuerzo.fin, tz),
        );
        total += hasta - desde - almuerzo;
      }
    }
    const siguiente = new TZDate(y, m, d + 1, 0, 0, 0, 0, tz);
    y = siguiente.getFullYear();
    m = siguiente.getMonth();
    d = siguiente.getDate();
  }
  return total;
}

/** Minutos laborales (con decimales) entre `inicio` y `fin`. */
export function calcularMinutosLaborales(
  inicio: Date | number,
  fin: Date | number,
  jornada: Jornada,
  tz: string = ZONA_HORARIA,
): number {
  return msLaborales(inicio, fin, jornada, tz) / MS_MIN;
}

export type EstadoReloj = 'CUENTA' | 'ALMUERZO' | 'FUERA_DE_HORARIO';

/** Si en el instante `t` el contador avanza o está detenido, y el mensaje para el operario. */
export function estadoReloj(
  t: Date | number,
  jornada: Jornada,
  tz: string = ZONA_HORARIA,
): { estado: EstadoReloj; mensaje: string } {
  const ahora = new TZDate(+t, tz);
  const y = ahora.getFullYear();
  const m = ahora.getMonth();
  const d = ahora.getDate();
  const ventana = jornada.dias[diaIso(ahora)];
  const ms = ahora.getTime();
  if (ventana) {
    const ini = instante(y, m, d, ventana.entrada, tz);
    const fin = instante(y, m, d, ventana.salida, tz);
    const almI = instante(y, m, d, jornada.almuerzo.inicio, tz);
    const almF = instante(y, m, d, jornada.almuerzo.fin, tz);
    if (ms >= almI && ms < almF && almI >= ini && almF <= fin) {
      return {
        estado: 'ALMUERZO',
        mensaje: `Almuerzo ${jornada.almuerzo.inicio}–${jornada.almuerzo.fin}: no se cuenta`,
      };
    }
    if (ms >= ini && ms < fin) return { estado: 'CUENTA', mensaje: 'Contando tiempo laboral' };
  }
  return {
    estado: 'FUERA_DE_HORARIO',
    mensaje: `Fuera de horario: se reanuda a las ${proximaEntrada(ms, jornada, tz)}`,
  };
}

/** Hora "HH:MM" en que vuelve a contar (primer día laborable siguiente, o hoy si aún no empieza). */
function proximaEntrada(ms: number, jornada: Jornada, tz: string): string {
  const base = new TZDate(ms, tz);
  for (let i = 0; i < 8; i++) {
    const dia = new TZDate(base.getFullYear(), base.getMonth(), base.getDate() + i, 0, 0, 0, 0, tz);
    const v = jornada.dias[diaIso(dia)];
    if (v && instante(dia.getFullYear(), dia.getMonth(), dia.getDate(), v.entrada, tz) > ms) {
      return v.entrada;
    }
  }
  return '07:00';
}
