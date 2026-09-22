// Server-only commerce. Browsers submit IDs/quantities, never authoritative prices.
import { createHash, timingSafeEqual } from 'node:crypto';
import Stripe from 'stripe';
import { getStore } from '@netlify/blobs';
import catalogue from './catalogue-data.json' with { type: 'json' };
import { CheckoutError, config } from './http.mjs';
const hash = (value) => createHash('sha256').update(value).digest('hex');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validateCart(items, products = catalogue) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 20)
    throw new CheckoutError('Choose between 1 and 20 product options.');
  const lines = new Map();
  for (const row of items) {
    if (!row || typeof row.productId !== 'string' || !Object.hasOwn(products, row.productId))
      throw new CheckoutError('An item is not in the catalogue.');
    const p = products[row.productId];
    const v = p.variants.find((v) => v.id === row.variantId);
    if (p.testOnly || p.available === false || !v || v.available === false || !v.image)
      throw new CheckoutError('An item or colour is unavailable.');
    if (!Number.isSafeInteger(row.quantity) || row.quantity < 1 || row.quantity > 99)
      throw new CheckoutError('Choose a whole-number quantity from 1 to 99.');
    if (
      !Number.isSafeInteger(p.priceCents) ||
      p.priceCents < 1 ||
      !/^price_[A-Za-z0-9]+$/.test(p.stripePriceId)
    )
      throw new CheckoutError('A product payment mapping is incomplete.', 409);
    const key = p.id + ':' + v.id;
    const qty = (lines.get(key)?.quantity || 0) + row.quantity;
    const caps = [99, p.stock, v.stock].filter(Number.isSafeInteger);
    if (qty > Math.min(...caps))
      throw new CheckoutError('The available quantity limit has been reached.');
    lines.set(key, {
      productId: p.id,
      variantId: v.id,
      quantity: qty,
      name: p.name,
      variant: v.label,
      sku: p.sku,
      unitCents: p.priceCents,
      stripePriceId: p.stripePriceId,
      image: v.image,
    });
  }
  for (const p of Object.values(products)) {
    if (
      Number.isSafeInteger(p.stock) &&
      [...lines.values()].filter((l) => l.productId === p.id).reduce((n, l) => n + l.quantity, 0) >
        p.stock
    )
      throw new CheckoutError('The available quantity limit has been reached.');
  }
  return [...lines.values()].sort((a, b) =>
    (a.productId + ':' + a.variantId).localeCompare(b.productId + ':' + b.variantId),
  );
}
export function checkStripePrice(price, line) {
  if (
    price.id !== line.stripePriceId ||
    price.active !== true ||
    price.type !== 'one_time' ||
    price.currency !== 'aud' ||
    price.unit_amount !== line.unitCents ||
    price.billing_scheme !== 'per_unit' ||
    price.custom_unit_amount ||
    price.product?.active === false
  )
    throw new CheckoutError(
      `The Stripe price for ${line.productId} does not match the catalogue. Checkout has been stopped.`,
      409,
    );
}
export function createCommerce({
  env = process.env,
  store,
  stripe,
  fetchImpl = fetch,
  products = catalogue,
} = {}) {
  const settings = config(env);
  const db = () =>
    store ||
    (store = getStore({
      name: `round-one-orders-${env.STRIPE_SECRET_KEY?.startsWith('sk_live_') ? 'stripe-live' : 'stripe-test'}-${env.PAYPAL_ENV === 'live' ? 'paypal-live' : 'paypal-sandbox'}-${env.CONTEXT || 'local'}`,
      consistency: 'strong',
    }));
  const stripeClient = () =>
    stripe ||
    (stripe = new Stripe(env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2, timeout: 20000 }));
  const get = (key) => db().get(key, { type: 'json', consistency: 'strong' });
  async function saveNew(key, value) {
    await db().setJSON(key, value, { onlyIfNew: true });
    return get(key);
  }
  let accessToken = null;
  async function paypal(path, { method = 'GET', body, idempotencyKey } = {}) {
    if (!accessToken) {
      const response = await fetchImpl(settings.paypalBase + '/v1/oauth2/token', {
        method: 'POST',
        headers: {
          Authorization:
            'Basic ' +
            Buffer.from(env.PAYPAL_CLIENT_ID + ':' + env.PAYPAL_CLIENT_SECRET).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new CheckoutError('PayPal configuration could not be verified.', 503);
      accessToken = (await response.json()).access_token;
    }
    const response = await fetchImpl(settings.paypalBase + path, {
      method,
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'PayPal-Request-Id': idempotencyKey } : {}),
        Prefer: 'return=representation',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok)
      throw new CheckoutError(
        'PayPal could not complete this payment request. No payment is confirmed here.',
        502,
      );
    return response.json();
  }
  function proof(token) {
    if (typeof token !== 'string' || !/^[0-9a-f]{64}$/.test(token))
      throw new CheckoutError('Invalid checkout verification token.', 403);
    return hash(token);
  }
  async function authorised(id, token) {
    if (!uuid.test(id || '')) throw new CheckoutError('Invalid order reference.');
    const order = await get('orders/' + id);
    const candidate = proof(token);
    if (!order || !timingSafeEqual(Buffer.from(candidate), Buffer.from(order.proofHash)))
      throw new CheckoutError('This browser cannot verify that order.', 403);
    return order;
  }
  async function create(body) {
    if (
      !['stripe', 'paypal'].includes(body.provider) ||
      !settings.enabled ||
      !settings[body.provider]
    )
      throw new CheckoutError('This payment method is not configured yet.', 503);
    if (!uuid.test(body.attemptId || '')) throw new CheckoutError('Invalid checkout reference.');
    const lines = validateCart(body.items, products);
    const proofHash = proof(body.checkoutToken);
    const subtotal = lines.reduce((n, l) => n + l.quantity * l.unitCents, 0);
    const total = subtotal + settings.shippingCents;
    if (!Number.isSafeInteger(total)) throw new CheckoutError('Invalid order total.');
    const snapshot = {
      id: body.attemptId,
      provider: body.provider,
      proofHash,
      lines,
      currency: 'AUD',
      shippingCents: settings.shippingCents,
      countries: settings.countries,
      subtotalCents: subtotal,
      totalCents: total,
      createdAt: new Date().toISOString(),
    };
    const fingerprint = hash(
      JSON.stringify({ lines, provider: body.provider, total, countries: settings.countries }),
    );
    snapshot.fingerprint = fingerprint;
    const order = await saveNew('orders/' + snapshot.id, snapshot);
    if (order.fingerprint !== fingerprint || order.proofHash !== proofHash)
      throw new CheckoutError('The cart changed. Start a new checkout.', 409);
    const previous = await get('sessions/' + order.id);
    if (previous) return { orderId: order.id, ...previous };
    if (Date.now() - Date.parse(order.createdAt) > 60 * 60 * 1000)
      throw new CheckoutError('This checkout attempt expired. Start a new checkout.', 409);
    const returnUrl = settings.origin + '/checkout/?order_id=' + order.id;
    let session;
    if (order.provider === 'stripe') {
      const client = stripeClient();
      for (const line of [...new Map(order.lines.map((l) => [l.stripePriceId, l])).values()])
        checkStripePrice(
          await client.prices.retrieve(line.stripePriceId, { expand: ['product'] }),
          line,
        );
      const metadata = { order_id: order.id };
      order.lines.forEach(
        (l, i) =>
          (metadata['item_' + (i + 1)] =
            `${l.productId} | ${l.variantId} | ${l.variant} | qty ${l.quantity}`.slice(0, 500)),
      );
      const response = await client.checkout.sessions.create(
        {
          mode: 'payment',
          payment_method_types: ['card'],
          client_reference_id: order.id,
          line_items: order.lines.map((l) => ({ price: l.stripePriceId, quantity: l.quantity })),
          metadata,
          payment_intent_data: { metadata: { order_id: order.id } },
          shipping_address_collection: { allowed_countries: order.countries },
          shipping_options: [
            {
              shipping_rate_data: {
                display_name: 'Shipping',
                type: 'fixed_amount',
                fixed_amount: { amount: order.shippingCents, currency: 'aud' },
              },
            },
          ],
          success_url: returnUrl + '&provider=stripe&session_id={CHECKOUT_SESSION_ID}',
          cancel_url: returnUrl + '&provider=stripe&cancelled=1',
          expires_at: Math.floor(Date.parse(order.createdAt) / 1000) + 3600,
        },
        { idempotencyKey: 'round-one-' + order.id },
      );
      if (!response.url || new URL(response.url).hostname !== 'checkout.stripe.com')
        throw new CheckoutError('Stripe returned an unexpected checkout destination.', 502);
      session = { provider: 'stripe', providerId: response.id, checkoutUrl: response.url };
    } else {
      const money = (cents) => (cents / 100).toFixed(2);
      const response = await paypal('/v2/checkout/orders', {
        method: 'POST',
        idempotencyKey: order.id,
        body: {
          intent: 'CAPTURE',
          purchase_units: [
            {
              reference_id: order.id,
              custom_id: order.id,
              invoice_id: 'round-one-' + order.id,
              description: 'Round One boxing equipment',
              amount: {
                currency_code: 'AUD',
                value: money(order.totalCents),
                breakdown: {
                  item_total: { currency_code: 'AUD', value: money(order.subtotalCents) },
                  shipping: { currency_code: 'AUD', value: money(order.shippingCents) },
                },
              },
              items: order.lines.map((l) => ({
                name: l.name.slice(0, 127),
                description: l.variant.slice(0, 127),
                sku: (l.productId + ':' + l.variantId).slice(0, 127),
                quantity: String(l.quantity),
                category: 'PHYSICAL_GOODS',
                unit_amount: { currency_code: 'AUD', value: money(l.unitCents) },
              })),
            },
          ],
          payment_source: {
            paypal: {
              experience_context: {
                brand_name: 'Round One',
                user_action: 'PAY_NOW',
                shipping_preference: 'GET_FROM_FILE',
                return_url: returnUrl + '&provider=paypal',
                cancel_url: returnUrl + '&provider=paypal&cancelled=1',
              },
            },
          },
        },
      });
      const approve = response.links?.find(
        (l) => l.rel === 'payer-action' || l.rel === 'approve',
      )?.href;
      if (
        !approve ||
        new URL(approve).hostname !== settings.paypalHost ||
        new URL(approve).protocol !== 'https:'
      )
        throw new CheckoutError('PayPal returned an unexpected checkout destination.', 502);
      session = { provider: 'paypal', providerId: response.id, checkoutUrl: approve };
    }
    await saveNew('providers/' + session.provider + '/' + session.providerId, {
      orderId: order.id,
    });
    const saved = await saveNew('sessions/' + order.id, session);
    return { orderId: order.id, ...saved };
  }
  async function savePaid(order, receipt) {
    return saveNew('payments/' + order.id, {
      orderId: order.id,
      provider: order.provider,
      paidAt: new Date().toISOString(),
      totalCents: order.totalCents,
      currency: order.currency,
      lines: order.lines,
      ...receipt,
    });
  }
  async function recordStripe(session) {
    const orderId = session.metadata?.order_id;
    if (!uuid.test(orderId || '')) return null;
    const order = await get('orders/' + orderId);
    if (!order || order.provider !== 'stripe') return null;
    if (session.payment_status !== 'paid' || session.status !== 'complete') return null;
    if (
      session.amount_total !== order.totalCents ||
      session.currency !== 'aud' ||
      session.client_reference_id !== orderId
    )
      throw new CheckoutError('Payment does not match the order.', 409);
    const bound = await get('sessions/' + orderId);
    if (bound && bound.providerId !== session.id)
      throw new CheckoutError('Payment session does not match.', 409);
    return savePaid(order, {
      providerId: session.id,
      transactionId:
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id,
      customer: session.customer_details,
      shipping: session.collected_information?.shipping_details || session.shipping_details,
    });
  }
  function checkPayPalOrder(order, response) {
    const unit = response.purchase_units?.[0];
    if (
      response.purchase_units?.length !== 1 ||
      unit.custom_id !== order.id ||
      unit.amount?.currency_code !== 'AUD' ||
      unit.amount?.value !== (order.totalCents / 100).toFixed(2)
    )
      throw new CheckoutError('PayPal order does not match the cart.', 409);
    const country = unit.shipping?.address?.country_code;
    if (['APPROVED', 'COMPLETED'].includes(response.status) && !order.countries.includes(country))
      throw new CheckoutError(
        'Shipping is not available for this address. Payment has not been confirmed.',
        409,
      );
    return unit;
  }
  async function recordPayPal(order, response) {
    const unit = checkPayPalOrder(order, response);
    if (response.status !== 'COMPLETED') return null;
    const captures = unit.payments?.captures || [];
    if (
      !captures.length ||
      captures.some((c) => c.status !== 'COMPLETED' || c.amount?.currency_code !== 'AUD') ||
      captures.reduce((n, c) => n + Math.round(Number(c.amount.value) * 100), 0) !==
        order.totalCents
    )
      return null;
    return savePaid(order, {
      providerId: response.id,
      transactionId: captures.map((c) => c.id).join(','),
      customer: response.payer,
      shipping: unit.shipping,
    });
  }
  async function status(body) {
    const order = await authorised(body.orderId, body.checkoutToken);
    const paid = await get('payments/' + order.id);
    if (paid)
      return {
        status: 'paid',
        orderId: order.id,
        totalCents: paid.totalCents,
        currency: paid.currency,
        items: order.lines.map(({ productId, variantId, quantity }) => ({
          productId,
          variantId,
          quantity,
        })),
      };
    const session = await get('sessions/' + order.id);
    if (!session) throw new CheckoutError('No payment session exists for this order.', 404);
    let receipt = null;
    if (order.provider === 'stripe')
      receipt = await recordStripe(
        await stripeClient().checkout.sessions.retrieve(session.providerId),
      );
    else {
      let response = await paypal('/v2/checkout/orders/' + encodeURIComponent(session.providerId));
      checkPayPalOrder(order, response);
      if (body.capture === true && response.status === 'APPROVED') {
        await paypal('/v2/checkout/orders/' + encodeURIComponent(session.providerId) + '/capture', {
          method: 'POST',
          idempotencyKey: order.id,
          body: {},
        });
        response = await paypal('/v2/checkout/orders/' + encodeURIComponent(session.providerId));
      }
      receipt = await recordPayPal(order, response);
    }
    return receipt
      ? {
          status: 'paid',
          orderId: order.id,
          totalCents: order.totalCents,
          currency: 'AUD',
          items: order.lines.map(({ productId, variantId, quantity }) => ({
            productId,
            variantId,
            quantity,
          })),
        }
      : { status: 'pending', orderId: order.id };
  }
  async function stripeWebhook(request) {
    const signature = request.headers.get('stripe-signature');
    if (!signature || !env.STRIPE_WEBHOOK_SECRET) throw new CheckoutError('Invalid webhook.', 400);
    let event;
    try {
      event = stripeClient().webhooks.constructEvent(
        await request.text(),
        signature,
        env.STRIPE_WEBHOOK_SECRET,
      );
    } catch {
      throw new CheckoutError('Invalid webhook signature.', 400);
    }
    if (
      ['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(
        event.type,
      )
    )
      await recordStripe(await stripeClient().checkout.sessions.retrieve(event.data.object.id));
    return { received: true };
  }
  async function paypalWebhook(request) {
    if (!env.PAYPAL_WEBHOOK_ID) throw new CheckoutError('Webhook is not configured.', 503);
    const text = await request.text();
    if (text.length > 262144) throw new CheckoutError('Webhook too large.', 413);
    let event;
    try {
      event = JSON.parse(text);
    } catch {
      throw new CheckoutError('Invalid webhook.');
    }
    const headers = request.headers;
    const verified = await paypal('/v1/notifications/verify-webhook-signature', {
      method: 'POST',
      body: {
        auth_algo: headers.get('paypal-auth-algo'),
        cert_url: headers.get('paypal-cert-url'),
        transmission_id: headers.get('paypal-transmission-id'),
        transmission_sig: headers.get('paypal-transmission-sig'),
        transmission_time: headers.get('paypal-transmission-time'),
        webhook_id: env.PAYPAL_WEBHOOK_ID,
        webhook_event: event,
      },
    });
    if (verified.verification_status !== 'SUCCESS')
      throw new CheckoutError('Invalid webhook signature.', 400);
    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const providerId = event.resource?.supplementary_data?.related_ids?.order_id;
      if (providerId) {
        const bound = await get('providers/paypal/' + providerId);
        if (bound) {
          const order = await get('orders/' + bound.orderId);
          await recordPayPal(
            order,
            await paypal('/v2/checkout/orders/' + encodeURIComponent(providerId)),
          );
        }
      }
    }
    return { received: true };
  }
  return { create, status, stripeWebhook, paypalWebhook, settings };
}
