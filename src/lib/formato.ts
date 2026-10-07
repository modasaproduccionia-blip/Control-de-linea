import { TZDate } from '@date-fns/tz';
import { ZONA_HORARIA } from '@/domain/jornada';

const pad = (n: number) => String(n).padStart(2, '0');
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** HH:MM:SS a partir de milisegundos. */
export function hms(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** "X h Y min" o "Y min". */
export function hm(min: number | null | undefined): string {
  const m = Math.round(min ?? 0);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}

/** Hora local de planta "HH:MM". */
export function reloj(iso: string | number | Date): string {
  const d = new TZDate(+new Date(iso), ZONA_HORARIA);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "mar 06/10 14:05" en hora de planta. */
export function fechaHora(iso: string | number | Date): string {
  const d = new TZDate(+new Date(iso), ZONA_HORARIA);
  return `${DIAS[d.getDay()]} ${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "06/10" desde "2026-10-06". */
export function diaMes(isoFecha: string): string {
  const [, m, d] = isoFecha.split('-');
  return `${d}/${m}`;
}

/** Fecha de hoy (America/Lima) en formato YYYY-MM-DD, desplazada `dias`. */
export function hoyLima(dias = 0): string {
  const d = new TZDate(Date.now(), ZONA_HORARIA);
  const x = new TZDate(d.getFullYear(), d.getMonth(), d.getDate() + dias, ZONA_HORARIA);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}
