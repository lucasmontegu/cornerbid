import { describe, expect, test } from 'bun:test';
import { isBlockedIdentity } from './blocklist';

describe('isBlockedIdentity', () => {
  test('allows ordinary brands', () => {
    expect(isBlockedIdentity({ type: 'x', key: 'x:levelsio', value: 'levelsio' })).toBe(false);
    expect(isBlockedIdentity({ type: 'website', key: 'website:fiber.so', value: 'fiber.so' })).toBe(
      false,
    );
  });

  test('blocks listed domains and slur-adjacent keys', () => {
    expect(isBlockedIdentity({ type: 'website', key: 'website:example.com', value: 'example.com' })).toBe(
      true,
    );
    expect(isBlockedIdentity({ type: 'x', key: 'x:xxxseller', value: 'xxxseller' })).toBe(true);
  });
});
