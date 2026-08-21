import { describe, expect, test } from 'bun:test';
import { localeFromAcceptLanguage, localeFromLanguageList } from './i18n';

describe('locale from browser languages', () => {
  test('es and es-* are Spanish', () => {
    expect(localeFromLanguageList(['es'])).toBe('es');
    expect(localeFromLanguageList(['es-AR'])).toBe('es');
    expect(localeFromLanguageList(['es-419'])).toBe('es');
    expect(localeFromAcceptLanguage('es-AR,es;q=0.9,en;q=0.8')).toBe('es');
  });

  test('first preferred language that is not Spanish is English', () => {
    expect(localeFromLanguageList(['en-US', 'es-AR'])).toBe('en');
    expect(localeFromAcceptLanguage('en-US,en;q=0.9,es;q=0.8')).toBe('en');
    expect(localeFromAcceptLanguage('en')).toBe('en');
  });

  test('q-values pick Spanish when it ranks first', () => {
    expect(localeFromAcceptLanguage('en;q=0.4,es-AR;q=0.9')).toBe('es');
  });

  test('missing header is English', () => {
    expect(localeFromAcceptLanguage(null)).toBe('en');
    expect(localeFromLanguageList([])).toBe('en');
  });
});
