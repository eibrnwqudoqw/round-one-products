export class CheckoutError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
export function json(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });
}
export function config(env = process.env) {
  const url = env.SITE_URL || env.URL || '';
  let origin = '';
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol === 'https:' ||
      (env.NETLIFY_DEV === 'true' && ['localhost', '127.0.0.1'].includes(parsed.hostname))
    )
      origin = parsed.origin;
  } catch {}
  const shippingCents = /^\d+$/.test(env.SHIPPING_CENTS || '') ? Number(env.SHIPPING_CENTS) : null;
  const countries = (env.SHIPPING_COUNTRIES || '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^[A-Z]{2}$/.test(s));
  const common =
    env.PAYMENTS_ENABLED === 'true' &&
    !!origin &&
    Number.isSafeInteger(shippingCents) &&
    shippingCents >= 0 &&
    countries.length > 0;
  return {
    origin,
    shippingCents,
    countries,
    currency: 'AUD',
    enabled: common,
    stripe: common && !!env.STRIPE_SECRET_KEY && !!env.STRIPE_WEBHOOK_SECRET,
    paypal:
      common &&
      !!env.PAYPAL_CLIENT_ID &&
      !!env.PAYPAL_CLIENT_SECRET &&
      !!env.PAYPAL_WEBHOOK_ID &&
      ['sandbox', 'live'].includes(env.PAYPAL_ENV),
    paypalBase:
      env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com',
    paypalHost: env.PAYPAL_ENV === 'live' ? 'www.paypal.com' : 'www.sandbox.paypal.com',
  };
}
export async function readBody(request, settings) {
  if (request.method !== 'POST') throw new CheckoutError('Method not allowed.', 405);
  if (!settings.origin || request.headers.get('origin') !== settings.origin)
    throw new CheckoutError('This request did not come from the shop.', 403);
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new CheckoutError('Expected JSON.', 415);
  const text = await request.text();
  if (text.length > 16384) throw new CheckoutError('Request too large.', 413);
  try {
    return JSON.parse(text);
  } catch {
    throw new CheckoutError('Invalid request.');
  }
}
export function errorResponse(error) {
  if (error instanceof CheckoutError) return json({ error: error.message }, error.status);
  console.error('Checkout service error:', error.name, error.statusCode || error.status || '');
  return json(
    { error: 'The payment service could not complete this request. Please try again.' },
    502,
  );
}
