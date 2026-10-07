import { describe, expect, it } from 'vitest';
import { roundHAZ } from './redondeo';

describe('roundHalfAwayFromZero', () => {
  it('redondea .5 alejándose de cero', () => {
    expect(roundHAZ(2.5)).toBe(3);
    expect(roundHAZ(-2.5)).toBe(-3);
    expect(roundHAZ(0.5)).toBe(1);
  });

  it('corrige errores de coma flotante', () => {
    expect(roundHAZ(1.005, 2)).toBe(1.01);
    expect(roundHAZ(33.335, 2)).toBe(33.34);
    expect(roundHAZ(102.00000000000001, 1)).toBe(102);
  });

  it('maneja decimales y el cero negativo', () => {
    expect(roundHAZ(66.66666, 1)).toBe(66.7);
    expect(Object.is(roundHAZ(-0.4), 0)).toBe(true);
  });
});
