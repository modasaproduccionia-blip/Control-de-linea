import { describe, expect, it } from 'vitest';
import { calcularMinutosLaborales, estadoReloj, JORNADA_POR_DEFECTO as J } from './jornada';

/** Instante en hora de Lima (UTC−5, sin horario de verano). 2026-10-06 es martes. */
const lima = (iso: string) => new Date(`${iso}:00-05:00`);
const min = (a: string, b: string) => calcularMinutosLaborales(lima(a), lima(b), J);

describe('calcularMinutosLaborales — casos obligatorios de PROMPT_MAESTRO §5.3', () => {
  it('Mar 07:00 → Mar 19:50 = 725', () => expect(min('2026-10-06T07:00', '2026-10-06T19:50')).toBe(725));
  it('Mar 11:00 → Mar 13:00 = 75', () => expect(min('2026-10-06T11:00', '2026-10-06T13:00')).toBe(75));
  it('Mar 11:50 → Mar 12:10 = 0 (todo en almuerzo)', () =>
    expect(min('2026-10-06T11:50', '2026-10-06T12:10')).toBe(0));
  it('Mar 18:00 → Mié 08:00 = 170 (la noche no cuenta)', () =>
    expect(min('2026-10-06T18:00', '2026-10-07T08:00')).toBe(170));
  it('Mar 19:00 → Mar 22:00 = 50', () => expect(min('2026-10-06T19:00', '2026-10-06T22:00')).toBe(50));
  it('Sáb 14:00 → Lun 09:00 = 240 (domingo no cuenta)', () =>
    expect(min('2026-10-10T14:00', '2026-10-12T09:00')).toBe(240));
  it('Lun 10:00 → Mié 10:00 = 1450 (días intermedios completos)', () =>
    expect(min('2026-10-05T10:00', '2026-10-07T10:00')).toBe(1450));
  it('06:30 → 07:30 = 30 (antes de las 07:00 no cuenta)', () =>
    expect(min('2026-10-06T06:30', '2026-10-06T07:30')).toBe(30));
});

describe('calcularMinutosLaborales — bordes', () => {
  it('fin antes que inicio o igual = 0', () => {
    expect(min('2026-10-06T10:00', '2026-10-06T09:00')).toBe(0);
    expect(min('2026-10-06T10:00', '2026-10-06T10:00')).toBe(0);
  });
  it('viernes cuenta hasta 19:50', () => expect(min('2026-10-09T17:00', '2026-10-09T20:00')).toBe(170));
  it('domingo completo = 0', () => expect(min('2026-10-11T07:00', '2026-10-11T19:50')).toBe(0));
  it('conserva segundos (fracción de minuto)', () =>
    expect(calcularMinutosLaborales(lima('2026-10-06T08:00'), new Date(lima('2026-10-06T08:00').getTime() + 90_000), J)).toBe(1.5));
  it('no depende de la zona horaria del servidor', () => {
    // vitest fija TZ=UTC; el resultado debe seguir usando la ventana de Lima.
    expect(min('2026-10-06T02:00', '2026-10-06T08:00')).toBe(60);
  });
});

describe('estadoReloj', () => {
  it('cuenta dentro de la ventana', () => expect(estadoReloj(lima('2026-10-06T09:00'), J).estado).toBe('CUENTA'));
  it('almuerzo', () => {
    const e = estadoReloj(lima('2026-10-06T12:00'), J);
    expect(e.estado).toBe('ALMUERZO');
    expect(e.mensaje).toBe('Almuerzo 11:40–12:25: no se cuenta');
  });
  it('fuera de horario de noche', () => {
    const e = estadoReloj(lima('2026-10-06T21:00'), J);
    expect(e.estado).toBe('FUERA_DE_HORARIO');
    expect(e.mensaje).toBe('Fuera de horario: se reanuda a las 07:00');
  });
  it('domingo está fuera de horario', () =>
    expect(estadoReloj(lima('2026-10-11T10:00'), J).estado).toBe('FUERA_DE_HORARIO'));
});
