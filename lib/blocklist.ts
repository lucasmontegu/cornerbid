/**
 * Cheap pre-filter at resolve / checkout time. The admin kill switch is still the
 * real mitigation for a listing that slips through (hotlinked image, D4).
 */

const BLOCKED_DOMAINS = new Set([
  'localhost',
  '127.0.0.1',
  'example.com',
  'example.org',
  't.me',
  'telegram.me',
  'telegram.org',
  'wa.me',
  'whatsapp.com',
  'chat.whatsapp.com',
  'discord.gg',
  'discord.com',
  'm.me',
  'messenger.com',
  'signal.me',
  'signal.org',
  'bit.ly',
  't.co',
  'tinyurl.com',
  'goo.gl',
  'ow.ly',
  'buff.ly',
  'is.gd',
]);

const BLOCKED_WORDS = ['porn', 'xxx', 'gore', 'nazi', 'hitler', 'nsfw'];

const CHAT_PATH = /\/(invite|joinchat|join)\b/i;

export function isBlockedIdentity(input: {
  key: string;
  value: string;
  type: 'x' | 'website';
  sourceUrl?: string;
}): boolean {
  const haystack = `${input.key} ${input.value} ${input.sourceUrl ?? ''}`.toLowerCase();
  if (BLOCKED_WORDS.some((word) => haystack.includes(word))) return true;
  if (input.type === 'website') {
    const host = input.value.split('/')[0]?.toLowerCase() ?? '';
    if (BLOCKED_DOMAINS.has(host)) return true;
    if (CHAT_PATH.test(input.sourceUrl ?? input.value)) return true;
  }
  return false;
}
