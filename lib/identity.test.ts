import { describe, expect, test } from 'bun:test';
import { isPrivateAddress, parseIdentityInput } from './identity';

describe('parseIdentityInput — canonical keys', () => {
  test('every spelling of an X handle collapses to one key', () => {
    for (const input of [
      '@levelsio', 'levelsio', '@LevelsIO', 'LEVELSIO',
      'https://x.com/levelsio', 'x.com/levelsio', 'https://twitter.com/levelsio',
      'https://www.x.com/levelsio/', 'https://x.com/LevelsIO',
    ]) {
      expect(parseIdentityInput(input)?.key).toBe('x:levelsio');
    }
  });

  test('every spelling of a domain collapses to one key', () => {
    for (const input of [
      'fiber.so', 'FIBER.SO', 'www.fiber.so', 'https://fiber.so',
      'https://www.Fiber.so/', 'http://fiber.so',
    ]) {
      expect(parseIdentityInput(input)?.key).toBe('website:fiber.so');
    }
  });

  test('a bare word with no dot is an X handle, not a hostname', () => {
    expect(parseIdentityInput('cab')?.type).toBe('x');
    expect(parseIdentityInput('cab')?.key).toBe('x:cab');
  });

  test('click destination is preserved for deep links; tracking query strings are dropped', () => {
    const parsed = parseIdentityInput(
      'https://crowdreply.io/features/citation-outreach?utm_source=x&ref=1',
    );
    expect(parsed?.key).toBe('website:crowdreply.io');
    expect(parsed?.sourceUrl).toBe('https://crowdreply.io/features/citation-outreach');
  });

  test('platform listings are keyed by path so two apps do not share a bid', () => {
    const a = parseIdentityInput('https://github.com/acme/one');
    const b = parseIdentityInput('https://github.com/acme/two?utm_source=x');
    expect(a?.key).toBe('website:github.com/acme/one');
    expect(b?.key).toBe('website:github.com/acme/two');
    expect(b?.sourceUrl).toBe('https://github.com/acme/two');
  });

  test('rejects junk', () => {
    for (const input of ['', '   ', '@', '@this-handle-is-far-too-long', 'not a url', '@bad!chars']) {
      expect(parseIdentityInput(input)).toBeNull();
    }
  });
});

describe('isPrivateAddress — the SSRF boundary', () => {
  test('blocks the addresses that matter', () => {
    for (const ip of [
      '127.0.0.1', '127.1.2.3',        // loopback
      '10.0.0.1', '10.255.255.255',    // private
      '172.16.0.1', '172.31.255.255',  // private
      '192.168.0.1', '192.168.1.1',    // private
      '169.254.169.254',               // cloud metadata — the classic SSRF target
      '0.0.0.0',
      '100.64.0.1',                    // carrier-grade NAT
      '224.0.0.1', '255.255.255.255',  // multicast / broadcast
      '::1', '::',                     // IPv6 loopback / unspecified
      'fc00::1', 'fd12:3456::1',       // IPv6 unique local
      'fe80::1',                       // IPv6 link-local
      '::ffff:127.0.0.1',              // IPv4-mapped loopback
      '::ffff:169.254.169.254',        // IPv4-mapped metadata
    ]) {
      expect(isPrivateAddress(ip)).toBe(true);
    }
  });

  test('allows genuinely public addresses', () => {
    for (const ip of ['8.8.8.8', '1.1.1.1', '104.18.32.7', '172.15.0.1', '172.32.0.1',
                      '192.167.0.1', '192.169.0.1', '2606:4700::1111']) {
      expect(isPrivateAddress(ip)).toBe(false);
    }
  });

  test('refuses anything it cannot parse rather than allowing it', () => {
    for (const value of ['', 'not-an-ip', '999.999.999.999', 'localhost']) {
      expect(isPrivateAddress(value)).toBe(true);
    }
  });

  test('boundaries of the 172.16/12 block are exact', () => {
    expect(isPrivateAddress('172.15.255.255')).toBe(false);
    expect(isPrivateAddress('172.16.0.0')).toBe(true);
    expect(isPrivateAddress('172.31.255.255')).toBe(true);
    expect(isPrivateAddress('172.32.0.0')).toBe(false);
  });
});
