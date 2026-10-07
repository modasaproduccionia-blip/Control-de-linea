import { describe, expect, it } from 'vitest';
import { calcularAvance } from './avance';
import { calcularCausas, pesosCausas, validarCausas } from './causas';
import { calcularCierre } from './duracion';
import { estadoTrasActividades, estadoTrasIncidencias } from './estados';
import { formatoHorasMin, tiempoImpactoMin, validarIncidencias } from './incidencias';
import { JORNADA_POR_DEFECTO } from './jornada';

const lima = (iso: string) => new Date(`${iso}:00-05:00`);

describe('calcularCierre (§5.2–5.4)', () => {
  it('captura original: 07:00 → 20:00 en L2 da 510 min de sobretiempo… ahora con almuerzo y corte 19:50', () => {
    const r = calcularCierre({
      horaInicio: lima('2026-10-06T07:00'),
      horaFin: lima('2026-10-06T20:00'),
      horaEstandarMin: 270,
      jornada: JORNADA_POR_DEFECTO,
    });
    expect(r.duracionRealMin).toBe(780);
    expect(r.minutosLaborales).toBe(725);
    expect(r.duracionLaboralMin).toBe(725);
    expect(r.sobretiempoMin).toBe(455);
    expect(r.cumpleTiempo).toBe(false);
  });

  it('nunca es menor que el estándar y entonces cumple', () => {
    const r = calcularCierre({
      horaInicio: lima('2026-10-06T08:00'),
      horaFin: lima('2026-10-06T09:00'),
      horaEstandarMin: 270,
      jornada: JORNADA_POR_DEFECTO,
    });
    expect(r.minutosLaborales).toBe(60);
    expect(r.duracionLaboralMin).toBe(270);
    expect(r.sobretiempoMin).toBe(0);
    expect(r.cumpleTiempo).toBe(true);
  });
});

describe('calcularAvance (§5.5–5.6)', () => {
  it('pondera por minutos y calcula no cumplidos sobre la duración laboral', () => {
    const r = calcularAvance({ minutosActividades: [198, 252, 366], minutosMarcados: [198], duracionLaboralMin: 270 });
    expect(r.avancePct).toBe(24.3);
    expect(r.minutosNoCumplidos).toBe(204); // 270 × 75.7 / 100 = 204.39
  });
  it('100% → 0 no cumplidos', () => {
    expect(calcularAvance({ minutosActividades: [10, 20], minutosMarcados: [10, 20], duracionLaboralMin: 300 })).toEqual({
      avancePct: 100,
      minutosNoCumplidos: 0,
    });
  });
  it('0 marcadas → toda la duración no cumplida', () => {
    expect(calcularAvance({ minutosActividades: [10], minutosMarcados: [], duracionLaboralMin: 270 }).minutosNoCumplidos).toBe(270);
  });
  it('sin actividades: avance null, no cumplidos = duración (como el original)', () => {
    expect(calcularAvance({ minutosActividades: [], minutosMarcados: [], duracionLaboralMin: 270 })).toEqual({
      avancePct: null,
      minutosNoCumplidos: 270,
    });
  });
  it('suma minutos decimales sin error de coma flotante', () => {
    const r = calcularAvance({ minutosActividades: [14.4, 28.2, 57.4], minutosMarcados: [14.4, 28.2], duracionLaboralMin: 100 });
    expect(r.avancePct).toBe(42.6);
  });
});

describe('incidencias (§5.8)', () => {
  it('acepta filas válidas que suman 100', () => {
    expect(validarIncidencias([{ motivoId: 'a', porcentaje: 60 }, { motivoId: 'b', porcentaje: 40 }])).toBeNull();
  });
  it('mensajes originales', () => {
    expect(validarIncidencias([{ motivoId: 'a', porcentaje: 50 }, { motivoId: 'a', porcentaje: 50 }])).toBe(
      'No se pueden registrar motivos repetidos',
    );
    expect(validarIncidencias([{ motivoId: 'a', porcentaje: 50 }])).toBe('Los porcentajes deben sumar 100%');
  });
  it('rechaza fila sin motivo o con 0% (corrección aprobada)', () => {
    expect(validarIncidencias([{ motivoId: '', porcentaje: 100 }])).toMatch(/motivo/);
    expect(validarIncidencias([{ motivoId: 'a', porcentaje: 100 }, { motivoId: 'b', porcentaje: 0 }])).toMatch(/porcentaje/);
  });
  it('tiempo de impacto y formato', () => {
    expect(tiempoImpactoMin(35, 455)).toBe(159.25);
    expect(formatoHorasMin(59.6)).toBe('1 h 0 min');
    expect(formatoHorasMin(510)).toBe('8 h 30 min');
  });
});

describe('causas (§5.9)', () => {
  it.each([
    [1, [100]],
    [2, [67, 33]],
    [3, [50, 33, 17]],
    [4, [40, 30, 20, 10]],
  ])('N=%i → pesos %j', (n, esperado) => {
    expect(calcularCausas(n, 100).map((c) => c.pesoAsignado)).toEqual(esperado);
  });
  it('reproduce el redondeo original aunque la suma no cuadre', () => {
    const r = calcularCausas(3, 125);
    expect(r.map((c) => c.minutosImpacto)).toEqual([63, 41, 21]); // suma 125
    const r6 = calcularCausas(6, 100);
    expect(r6.map((c) => c.pesoAsignado)).toEqual([29, 24, 19, 14, 10, 5]); // suma 101
  });
  it('usa el peso sin redondear cuando el redondeado es ≤ 1', () => {
    const r = calcularCausas(14, 1000);
    expect(r[13]!.pesoAsignado).toBe(1);
    expect(r[13]!.minutosImpacto).toBe(Math.round(1000 * pesosCausas(14)[13]!));
  });
  it('validaciones', () => {
    expect(validarCausas([])).toBe('No hay causas para guardar');
    expect(validarCausas(['a', 'a'])).toBe('No se pueden registrar causas repetidas');
    expect(validarCausas(['a', 'b'])).toBeNull();
  });
});

describe('estados (§5.7, §6)', () => {
  it('navegación tras actividades', () => {
    expect(estadoTrasActividades(10, 5)).toBe('PENDIENTE_INCIDENCIAS_TIEMPO');
    expect(estadoTrasActividades(0, 5)).toBe('PENDIENTE_CAUSAS');
    expect(estadoTrasActividades(0, 0)).toBe('COMPLETADO');
    expect(estadoTrasIncidencias(5)).toBe('PENDIENTE_CAUSAS');
    expect(estadoTrasIncidencias(0)).toBe('COMPLETADO');
  });
});
