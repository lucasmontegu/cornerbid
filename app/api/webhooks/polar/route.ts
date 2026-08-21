/**
 * Polar webhook. Fulfillment happens here, never on /success.
 */
import { settleFromRail } from '@/lib/settle';
import { polarRail } from '@/lib/rails/polar';

export async function POST(request: Request): Promise<Response> {
  return settleFromRail(polarRail, request);
}
