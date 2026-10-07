import { describe, expect, it } from 'vitest';
import { codigoBus, esNumeroBusValido } from './codigo-bus';

describe('código de bus', () => {
  it('concatena sigla y número', () => expect(codigoBus('CM', '123')).toBe('CM123'));

  it('exige exactamente 3 dígitos', () => {
    expect(esNumeroBusValido('001')).toBe(true);
    expect(esNumeroBusValido('12')).toBe(false);
    expect(esNumeroBusValido('1234')).toBe(false);
    expect(esNumeroBusValido('12a')).toBe(false);
  });
});
