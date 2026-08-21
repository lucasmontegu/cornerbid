import { createHmac } from 'node:crypto';
import { describe, expect, test } from 'bun:test';
import {
  isPaymentNotification,
  paymentIdFromNotification,
  verifyMercadoPagoSignature,
} from './mercadopago-signature';

const SECRET = 'test_webhook_secret';

function sign(dataId: string, requestId: string, ts: string): string {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const v1 = createHmac('sha256', SECRET).update(manifest).digest('hex');
  return `ts=${ts},v1=${v1}`;
}

describe('Mercado Pago Checkout Pro signature', () => {
  test('accepts a valid v1 HMAC', () => {
    const ts = '1704908010';
    expect(() =>
      verifyMercadoPagoSignature({
        xSignature: sign('1234567890', 'abc-req', ts),
        xRequestId: 'abc-req',
        dataId: '1234567890',
        secret: SECRET,
      }),
    ).not.toThrow();
  });

  test('rejects a tampered hash', () => {
    expect(() =>
      verifyMercadoPagoSignature({
        xSignature: 'ts=1704908010,v1=deadbeef',
        xRequestId: 'abc-req',
        dataId: '1234567890',
        secret: SECRET,
      }),
    ).toThrow(/mismatch/);
  });

  test('rejects a replay outside the tolerance window', () => {
    const ts = '1000';
    expect(() =>
      verifyMercadoPagoSignature({
        xSignature: sign('99', 'r1', ts),
        xRequestId: 'r1',
        dataId: '99',
        secret: SECRET,
        toleranceSeconds: 300,
        now: () => 1_704_908_010_000,
      }),
    ).toThrow(/tolerance/);
  });
});

describe('Checkout Pro notification parsing', () => {
  test('reads data.id from the query string (webhooks v1)', () => {
    const url = new URL('https://cornerbid.lol/api/webhooks/mercadopago?data.id=42&type=payment');
    expect(isPaymentNotification(url, null)).toBe(true);
    expect(paymentIdFromNotification(url, null)).toBe('42');
  });

  test('reads topic=payment&id= (legacy IPN)', () => {
    const url = new URL('https://cornerbid.lol/api/webhooks/mercadopago?topic=payment&id=99');
    expect(isPaymentNotification(url, null)).toBe(true);
    expect(paymentIdFromNotification(url, null)).toBe('99');
  });

  test('reads payment.updated JSON bodies', () => {
    const url = new URL('https://cornerbid.lol/api/webhooks/mercadopago');
    const body = { type: 'payment', action: 'payment.updated', data: { id: '777' } };
    expect(isPaymentNotification(url, body)).toBe(true);
    expect(paymentIdFromNotification(url, body)).toBe('777');
  });

  test('ignores merchant_order topics', () => {
    const url = new URL('https://cornerbid.lol/api/webhooks/mercadopago?topic=merchant_order&id=1');
    expect(isPaymentNotification(url, null)).toBe(false);
  });
});
