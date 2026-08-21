import { describe, expect, test } from 'bun:test';
import { usdCentsToArs } from './ars';
import { isArgentinaHint, resolveCheckoutRail } from './select';

describe('rail routing', () => {
  test('Polar is the default even for Argentina until they opt into MP', () => {
    expect(resolveCheckoutRail(undefined, true)).toBe('polar');
    expect(resolveCheckoutRail('polar', true)).toBe('polar');
    expect(resolveCheckoutRail(undefined, false)).toBe('polar');
  });

  test('Mercado Pago only when Argentine and they asked for it', () => {
    expect(resolveCheckoutRail('mercadopago', true)).toBe('mercadopago');
    expect(resolveCheckoutRail('mercadopago', false)).toBe('polar');
  });
});

describe('Argentina hint', () => {
  test('timezone America/Argentina counts', () => {
    expect(isArgentinaHint({ timeZone: 'America/Argentina/Buenos_Aires' })).toBe(true);
  });

  test('es-AR language tag counts', () => {
    expect(isArgentinaHint({ acceptLanguage: 'es-AR,es;q=0.9' })).toBe(true);
  });

  test('US does not', () => {
    expect(isArgentinaHint({ country: 'US', timeZone: 'America/New_York', acceptLanguage: 'en-US' })).toBe(
      false,
    );
  });
});

describe('USD → ARS freeze', () => {
  test('converts cents through the frozen rate', () => {
    expect(usdCentsToArs(100, 1400)).toBe(1400);
    expect(usdCentsToArs(24800, 1400)).toBe(347200);
    expect(usdCentsToArs(150, 1400)).toBe(2100);
  });

  test('rejects a missing rate', () => {
    expect(() => usdCentsToArs(100, 0)).toThrow(/MP_USD_ARS_RATE/);
  });
});
