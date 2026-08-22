/**
 * PayPal Orders v2 notifications.
 *
 * Fulfillment happens here, never on /success. The signature is verified inside the
 * rail against PayPal's verify-webhook-signature endpoint before anything is read
 * from the payload.
 *
 * The rail also captures the order when CHECKOUT.ORDER.APPROVED arrives, so a buyer
 * who closes the tab after approving is still charged and still gets the slot.
 *
 * GET exists because the dashboard pings the URL when you save it.
 */
import { payPalRail } from '@/lib/rails/paypal';
import { settleFromRail } from '@/lib/settle';

export async function GET(): Promise<Response> {
  return new Response('ok', { status: 200 });
}

export async function POST(request: Request): Promise<Response> {
  return settleFromRail(payPalRail, request);
}
