/**
 * Mercado Pago Checkout Pro notifications.
 *
 * Fulfillment happens here, never on /success. Signature is verified inside the
 * rail (`x-signature` HMAC) before the payment is fetched from the API.
 *
 * GET exists because the dashboard pings the URL when you save it.
 */
import { settleFromRail } from '@/lib/settle';
import { mercadoPagoRail } from '@/lib/rails/mercadopago';

export async function GET(): Promise<Response> {
  return new Response('ok', { status: 200 });
}

export async function POST(request: Request): Promise<Response> {
  return settleFromRail(mercadoPagoRail, request);
}
