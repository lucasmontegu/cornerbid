import { describe, expect, test } from 'bun:test';
import { usdCentsToArs } from './ars';
import { isArgentinaHint, resolveCheckoutRail } from './select';

describe('rail routing', () => {
  test('Polar is the default even for Argentina until they opt into MP', () => {
    expect(resolveCheckoutRail(undefined, true)).toBe('polar');
    expect(resolveCheckoutRail('polar', true)).toBe('polar');
    expect(resolveCheckoutRail(undefined, false)).toBe('polar');
  });

  test('explicit Mercado Pago wins even if the Argentina heuristic missed', () => {
    expect(resolveCheckoutRail('mercadopago', true)).toBe('mercadopago');
    expect(resolveCheckoutRail('mercadopago', false)).toBe('mercadopago');
  });
});

describe('Argentina hint', () => {
  test('timezone America/Argentina counts', () => {
    expect(isArgentinaHint({ timeZone: 'America/Argentina/Buenos_Aires' })).toBe(true);
  });

  test('legacy Argentina timezone aliases count', () => {
    expect(isArgentinaHint({ timeZone: 'America/Buenos_Aires' })).toBe(true);
    expect(isArgentinaHint({ timeZone: 'America/Cordoba' })).toBe(true);
    expect(isArgentinaHint({ timeZone: 'America/Mendoza' })).toBe(true);
    expect(isArgentinaHint({ timeZone: 'America/Argentina/Cordoba' })).toBe(true);
  });

  test('es-AR language tag counts', () => {
    expect(isArgentinaHint({ acceptLanguage: 'es-AR,es;q=0.9' })).toBe(true);
  });

  test('English UI with AR region still counts', () => {
    expect(isArgentinaHint({ acceptLanguage: 'en-AR' })).toBe(true);
    expect(isArgentinaHint({ acceptLanguage: 'en,es-AR;q=0.8' })).toBe(true);
    expect(
      isArgentinaHint({
        timeZone: 'America/Argentina/Buenos_Aires',
        acceptLanguage: 'en-US',
      }),
    ).toBe(true);
  });

  test('plain English without AR region or timezone does not', () => {
    expect(isArgentinaHint({ acceptLanguage: 'en' })).toBe(false);
    expect(isArgentinaHint({ acceptLanguage: 'es' })).toBe(false);
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
