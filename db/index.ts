/**
 * Neon connection.
 *
 * Uses the HTTP driver deliberately. `/api/state` is polled every 2s per connected
 * viewer, so it is by far the hottest query in the system and benefits from skipping
 * the WebSocket handshake entirely.
 *
 * The trade-off: neon-http has no interactive transactions. Nothing here needs one —
 * the takeover is expressed as a single CTE-chained statement (see lib/takeover.ts)
 * and corner-hit recording is a single INSERT ... ON CONFLICT DO NOTHING. Both are
 * atomic as single statements, which is stronger than a transaction that could be
 * left open by a frozen serverless invocation.
 */
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

export const db = drizzle(neon(connectionString), { schema });
export { schema };
