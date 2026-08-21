/**
 * Turning a single user input — `@levelsio` or `fiber.so` — into an advertiser
 * identity: a canonical key, a display name and an image URL.
 *
 * The website path fetches a URL chosen by an anonymous user, which makes this the
 * most dangerous code in the project. Everything in `assertPublicHost` exists to stop
 * it from being used to reach the internal network.
 */
import { lookup as dnsLookup } from 'node:dns';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { Agent, fetch as undiciFetch } from 'undici';

export type IdentityType = 'x' | 'website';

export interface ParsedIdentity {
  type: IdentityType;
  /** Canonical namespaced key: `x:levelsio` or `website:fiber.so`. */
  key: string;
  /** Where a click on the logo goes. */
  sourceUrl: string;
  /** Handle or domain, without the namespace. */
  value: string;
}

export interface ResolvedIdentity extends ParsedIdentity {
  displayName: string;
  description: string | null;
  imageUrl: string;
}

const X_HOSTS = new Set(['x.com', 'twitter.com', 'www.x.com', 'www.twitter.com']);
const X_HANDLE = /^[A-Za-z0-9_]{1,15}$/;
const FETCH_TIMEOUT_MS = 5_000;
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;

/**
 * Normalizes aggressively so that `@Levelsio`, `levelsio` and
 * `https://x.com/levelsio/` all collapse to the single key `x:levelsio`.
 * Without this the same brand could hold the slot twice under different spellings.
 */
export function parseIdentityInput(raw: string): ParsedIdentity | null {
  const input = raw.trim();
  if (!input) return null;

  if (input.startsWith('@')) {
    const handle = input.slice(1).toLowerCase();
    if (!X_HANDLE.test(handle)) return null;
    return { type: 'x', key: `x:${handle}`, sourceUrl: `https://x.com/${handle}`, value: handle };
  }

  const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();

  if (X_HOSTS.has(host)) {
    const handle = url.pathname.split('/').filter(Boolean)[0]?.toLowerCase();
    if (!handle || !X_HANDLE.test(handle)) return null;
    return { type: 'x', key: `x:${handle}`, sourceUrl: `https://x.com/${handle}`, value: handle };
  }

  // No dot and no scheme typed: treat as a bare X handle, not a hostname.
  if (!input.includes('.') && !/^https?:\/\//i.test(input)) {
    const handle = input.toLowerCase();
    if (!X_HANDLE.test(handle)) return null;
    return { type: 'x', key: `x:${handle}`, sourceUrl: `https://x.com/${handle}`, value: handle };
  }

  url.search = '';
  url.hash = '';

  const domain = host.replace(/^www\./, '');
  if (!domain.includes('.') || domain.length > 253) return null;

  const path = url.pathname === '/' ? '' : url.pathname.replace(/\/+$/, '');
  const sourceUrl = `${url.protocol}//${url.host}${path}`;

  if (isPathKeyedHost(domain)) {
    const pathKey = path || '/';
    return {
      type: 'website',
      key: `website:${domain}${pathKey}`,
      sourceUrl,
      value: `${domain}${pathKey}`,
    };
  }

  return {
    type: 'website',
    key: `website:${domain}`,
    sourceUrl,
    value: domain,
  };
}

/** Stores, GitHub and similar platforms share a host, so the path is the listing. */
const PATH_KEYED_HOSTS = new Set([
  'github.com',
  'gitlab.com',
  'bitbucket.org',
  'apps.apple.com',
  'itunes.apple.com',
  'play.google.com',
  'chromewebstore.google.com',
  'chrome.google.com',
  'npmjs.com',
  'pypi.org',
  'producthunt.com',
]);

function isPathKeyedHost(domain: string): boolean {
  return PATH_KEYED_HOSTS.has(domain);
}

/** IPv4/IPv6 ranges that must never be reachable from a user-supplied URL. Exported for tests. */
export function isPrivateAddress(ip: string): boolean {
  const version = isIP(ip);

  if (version === 4) {
    const [a = 0, b = 0] = ip.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127) return true; // this-network, private, loopback
    if (a === 169 && b === 254) return true; // link-local, covers cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
    if (a >= 224) return true; // multicast and reserved
    return false;
  }

  if (version === 6) {
    const normalized = ip.toLowerCase().replace(/^\[|\]$/g, '');
    if (normalized === '::1' || normalized === '::') return true;
    if (/^f[cd]/.test(normalized)) return true; // unique local
    if (/^fe[89ab]/.test(normalized)) return true; // link-local
    if (normalized.startsWith('::ffff:')) {
      return isPrivateAddress(normalized.slice(7)); // IPv4-mapped
    }
    return false;
  }

  return true; // unparseable: refuse
}

/**
 * Rejects anything that does not resolve to a public address.
 *
 * Checked against the *resolved* address, not the hostname — a domain the attacker
 * controls can point straight at 169.254.169.254 and look perfectly ordinary.
 */
async function assertPublicHost(url: URL): Promise<void> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`refused scheme: ${url.protocol}`);
  }

  const literal = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(literal)) {
    if (isPrivateAddress(literal)) throw new Error(`refused private address: ${literal}`);
    return;
  }

  const addresses = await lookup(url.hostname, { all: true });
  if (addresses.length === 0) throw new Error(`could not resolve ${url.hostname}`);
  for (const { address } of addresses) {
    if (isPrivateAddress(address)) {
      throw new Error(`${url.hostname} resolves to a private address`);
    }
  }
}

/**
 * Dispatcher that validates the address at connect time.
 *
 * Checking the host before calling `fetch` is not enough on its own: `fetch` resolves
 * DNS again, so an attacker controlling their own zone with a zero TTL can answer
 * with a public address for our check and a private one for the actual connection.
 * That is DNS rebinding, and the pre-check silently validates a resolution nobody
 * uses.
 *
 * Hooking `lookup` closes the window — the address is rejected at the moment the
 * socket would open, and every redirect hop goes through the same dispatcher.
 */
const guardedDispatcher = new Agent({
  connect: {
    lookup(hostname, options, callback) {
      dnsLookup(hostname, options, (error, address, family) => {
        if (error) return callback(error, address as never, family as never);

        const candidates = Array.isArray(address)
          ? (address as unknown as Array<{ address: string }>)
          : [{ address: address as unknown as string }];

        for (const candidate of candidates) {
          if (isPrivateAddress(candidate.address)) {
            return callback(
              new Error(`${hostname} resolves to a non-public address`),
              address as never,
              family as never,
            );
          }
        }
        callback(null, address as never, family as never);
      });
    },
  },
});

/**
 * Fetch with the guard applied to every hop.
 *
 * Redirects are followed manually: `redirect: 'follow'` would let a public URL bounce
 * to an internal one after the check already passed.
 */
type UndiciResponse = Awaited<ReturnType<typeof undiciFetch>>;

async function guardedFetch(target: string): Promise<UndiciResponse> {
  let current = new URL(target);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    // First line of defence and a clearer error message. The dispatcher below is what
    // actually guarantees it, because it runs at connect time.
    await assertPublicHost(current);

    // undici's own fetch, not the global one. Node ships an internal copy of undici
    // and Bun has a native fetch; neither accepts a dispatcher from the npm package —
    // Node rejects the type and Bun drops the option silently, which would leave the
    // guard looking installed while doing nothing.
    const response = await undiciFetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { 'user-agent': 'CornerBid/1.0 (+https://cornerbid.lol)' },
      dispatcher: guardedDispatcher,
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) return response;
      current = new URL(location, current);
      continue;
    }
    return response;
  }

  throw new Error('too many redirects');
}

function pickMeta(html: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

/** Resolves a website's icon and title from its markup, in order of preference. */
async function resolveWebsite(parsed: ParsedIdentity): Promise<ResolvedIdentity> {
  const response = await guardedFetch(parsed.sourceUrl);
  const reader = response.body?.getReader();
  let html = '';

  if (reader) {
    const decoder = new TextDecoder();
    let bytes = 0;
    while (bytes < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      html += decoder.decode(value, { stream: true });
      if (html.includes('</head>')) break; // everything we need lives in <head>
    }
    await reader.cancel().catch(() => {});
  }

  const base = new URL(parsed.sourceUrl);
  const absolute = (href: string) => {
    try {
      return new URL(href, base).toString();
    } catch {
      return null;
    }
  };

  const image =
    pickMeta(html, [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<link[^>]+rel=["']apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["']/i,
      /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i,
    ]) ?? '/favicon.ico';

  const title =
    pickMeta(html, [
      /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
      /<title[^>]*>([^<]+)<\/title>/i,
    ]) ?? parsed.value;

  const description = pickMeta(html, [
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
  ]);

  return {
    ...parsed,
    displayName: title.slice(0, 80),
    description: description?.slice(0, 200) ?? null,
    imageUrl: absolute(image) ?? `${base.origin}/favicon.ico`,
  };
}

/**
 * Resolves an identity. Never trust a client-supplied image URL — always re-resolve
 * server-side, or anyone can point the on-screen logo at arbitrary content.
 */
export async function resolveIdentity(parsed: ParsedIdentity): Promise<ResolvedIdentity> {
  if (parsed.type === 'x') {
    return {
      ...parsed,
      displayName: `@${parsed.value}`,
      description: null,
      imageUrl: `https://unavatar.io/x/${parsed.value}`,
    };
  }
  return resolveWebsite(parsed);
}
