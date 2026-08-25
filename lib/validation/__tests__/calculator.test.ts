import { describe, it, expect } from 'vitest';
import { calculatorInputSchema } from '../calculator';

describe('calculatorInputSchema', () => {
  it('accepts valid input', () => {
    expect(
      calculatorInputSchema.safeParse({
        countryCode: 'DE',
        boxSize: '32cm',
        material: 'kraft',
        print: 'plain',
        boxesPerOrder: 5000,
        monthlyVolume: 20000,
        currentPrice: 0.35,
      }).success,
    ).toBe(true);
  });

  it('rejects non-positive volume and price', () => {
    expect(
      calculatorInputSchema.safeParse({
        countryCode: 'DE',
        boxSize: '32cm',
        material: 'kraft',
        print: 'plain',
        boxesPerOrder: 0,
        monthlyVolume: 0,
        currentPrice: -1,
      }).success,
    ).toBe(false);
  });

  it('rejects unknown enum values', () => {
    expect(
      calculatorInputSchema.safeParse({
        countryCode: 'DE',
        boxSize: '99cm',
        material: 'kraft',
        print: 'plain',
        boxesPerOrder: 5000,
        monthlyVolume: 20000,
        currentPrice: 0.35,
      }).success,
    ).toBe(false);
  });
});
