import { config, json } from '../../lib/http.mjs';
export default async (request) => {
  if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);
  const c = config();
  return json({
    stripe: c.stripe,
    paypal: c.paypal,
    paypalHost: c.paypalHost,
    currency: c.currency,
    shippingCents: c.shippingCents,
    countries: c.countries,
  });
};
