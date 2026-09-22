import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import Stripe from 'stripe';
import { createCommerce, validateCart, checkStripePrice } from '../lib/payments.mjs';
import { config, readBody } from '../lib/http.mjs';
const env = {
  SITE_URL: 'https://roundone.example',
  PAYMENTS_ENABLED: 'true',
  SHIPPING_CENTS: '1200',
  SHIPPING_COUNTRIES: 'AU',
  STRIPE_SECRET_KEY: 'test-not-a-real-key',
  STRIPE_WEBHOOK_SECRET: 'test-webhook-secret',
  PAYPAL_CLIENT_ID: 'test-client',
  PAYPAL_CLIENT_SECRET: 'test-secret',
  PAYPAL_WEBHOOK_ID: 'test-webhook-id',
  PAYPAL_ENV: 'sandbox',
};
const token = 'ab'.repeat(32);
const items = [{ productId: 'gloves7', variantId: 'red-12oz', quantity: 2 }];
const body = (provider = 'stripe') => ({
  provider,
  items,
  attemptId: randomUUID(),
  checkoutToken: token,
});
function storage() {
  const values = new Map();
  return {
    values,
    get: async (key) => structuredClone(values.get(key) || null),
    setJSON: async (key, value, options) => {
      if (options?.onlyIfNew && values.has(key)) return { modified: false };
      values.set(key, structuredClone(value));
      return { modified: true };
    },
  };
}
function stripeMock() {
  let created = 0;
  let session;
  let input;
  let paid = false;
  return {
    get created() {
      return created;
    },
    get input() {
      return input;
    },
    set paid(value) {
      paid = value;
    },
    prices: {
      retrieve: async (id) => ({
        id,
        active: true,
        type: 'one_time',
        currency: 'aud',
        unit_amount: 13999,
        billing_scheme: 'per_unit',
        product: { active: true },
      }),
    },
    checkout: {
      sessions: {
        create: async (args) => {
          created++;
          input = args;
          session = {
            id: 'cs_test_verified',
            url: 'https://checkout.stripe.com/c/pay/test',
            metadata: args.metadata,
            client_reference_id: args.client_reference_id,
            amount_total: 29198,
            currency: 'aud',
            payment_intent: 'pi_test',
          };
          return session;
        },
        retrieve: async () => ({
          ...session,
          status: paid ? 'complete' : 'open',
          payment_status: paid ? 'paid' : 'unpaid',
        }),
      },
    },
    webhooks: new Stripe('test').webhooks,
  };
}
test('Payment config fails closed without credentials, shipping and explicit enablement', () => {
  assert.equal(config({}).enabled, false);
  assert.equal(config({ ...env, SHIPPING_CENTS: '' }).stripe, false);
  assert.equal(config({ ...env, PAYMENTS_ENABLED: 'false' }).paypal, false);
  assert.equal(config(env).stripe, true);
});
test('Server rejects unknown IDs, missing images, test entries and invalid quantities; ignores client prices', () => {
  assert.equal(
    validateCart([{ ...items[0], priceCents: 1, stripePriceId: 'price_forged' }])[0].unitCents,
    13999,
  );
  for (const row of [
    { productId: '__proto__', variantId: 'x', quantity: 1 },
    { productId: 'gloves7', variantId: 'cyan-12oz', quantity: 1 },
    { productId: 'glovestest', variantId: 'black-16oz', quantity: 1 },
    { ...items[0], quantity: 100 },
    { ...items[0], quantity: 1.2 },
  ])
    assert.throws(() => validateCart([row]));
});
test('Stripe live catalogue mismatch stops checkout', () => {
  const line = validateCart(items)[0];
  const price = {
    id: line.stripePriceId,
    active: true,
    type: 'one_time',
    currency: 'aud',
    unit_amount: line.unitCents,
    billing_scheme: 'per_unit',
    product: { active: true },
  };
  assert.doesNotThrow(() => checkStripePrice(price, line));
  for (const patch of [
    { active: false },
    { currency: 'usd' },
    { unit_amount: 1 },
    { type: 'recurring' },
    { id: 'price_wrong' },
    { product: { active: false } },
  ])
    assert.throws(() => checkStripePrice({ ...price, ...patch }, line));
});
test('Stripe uses existing Price IDs and variants, retries once, and verifies payment before recording', async () => {
  const store = storage(),
    stripe = stripeMock(),
    service = createCommerce({ env, store, stripe });
  const request = body();
  const first = await service.create(request);
  const second = await service.create(request);
  assert.equal(first.checkoutUrl, second.checkoutUrl);
  assert.equal(stripe.created, 1);
  assert.equal(stripe.input.line_items[0].price, validateCart(items)[0].stripePriceId);
  assert.match(stripe.input.metadata.item_1, /red-12oz/);
  assert.equal(stripe.input.shipping_options[0].shipping_rate_data.fixed_amount.amount, 1200);
  const check = { orderId: request.attemptId, checkoutToken: token };
  assert.equal((await service.status(check)).status, 'pending');
  assert.equal(store.values.has('payments/' + request.attemptId), false);
  await assert.rejects(
    service.status({ ...check, checkoutToken: 'cd'.repeat(32) }),
    /cannot verify/,
  );
  await assert.rejects(
    service.create({ ...request, items: [{ ...items[0], quantity: 3 }] }),
    /cart changed/,
  );
  stripe.paid = true;
  assert.equal((await service.status(check)).status, 'paid');
  assert.equal((await service.status(check)).totalCents, 29198);
  assert.equal([...store.values.keys()].filter((k) => k.startsWith('payments/')).length, 1);
});
test('Stripe webhook validates real SDK signatures and does not accept forged events', async () => {
  const store = storage(),
    stripe = stripeMock(),
    service = createCommerce({ env, store, stripe });
  const request = body();
  await service.create(request);
  stripe.paid = true;
  const payload = JSON.stringify({
    id: 'evt_test',
    type: 'checkout.session.completed',
    data: { object: { id: 'cs_test_verified' } },
  });
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: env.STRIPE_WEBHOOK_SECRET,
  });
  await service.stripeWebhook(
    new Request('https://roundone.example/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': signature },
      body: payload,
    }),
  );
  assert(store.values.has('payments/' + request.attemptId));
  await assert.rejects(
    service.stripeWebhook(
      new Request('https://roundone.example/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'forged' },
        body: payload,
      }),
    ),
    /signature/,
  );
});
function paypalMock() {
  let order;
  let createCount = 0;
  let captureCount = 0;
  let approved = false;
  let country = 'AU';
  let verification = 'SUCCESS';
  let badAmount = false;
  const request = async (url, options = {}) => {
    if (url.endsWith('/v1/oauth2/token')) return Response.json({ access_token: 'test-access' });
    if (url.endsWith('/verify-webhook-signature'))
      return Response.json({ verification_status: verification });
    if (url.endsWith('/v2/checkout/orders') && options.method === 'POST') {
      createCount++;
      const input = JSON.parse(options.body);
      order = {
        id: 'PAYPAL-TEST-ORDER',
        status: 'CREATED',
        purchase_units: input.purchase_units,
        links: [
          { rel: 'payer-action', href: 'https://www.sandbox.paypal.com/checkoutnow?token=TEST' },
        ],
      };
      return Response.json(order);
    }
    if (url.endsWith('/capture')) {
      captureCount++;
      order.status = 'COMPLETED';
      order.purchase_units[0].payments = {
        captures: [
          {
            id: 'CAPTURE-TEST',
            status: 'COMPLETED',
            amount: { currency_code: 'AUD', value: '291.98' },
          },
        ],
      };
      return Response.json(order);
    }
    if (url.endsWith('/PAYPAL-TEST-ORDER')) {
      const data = structuredClone(order);
      if (approved && data.status === 'CREATED') data.status = 'APPROVED';
      data.purchase_units[0].shipping = { address: { country_code: country } };
      if (badAmount) data.purchase_units[0].amount.value = '0.01';
      return Response.json(data);
    }
    throw Error('Unexpected PayPal request ' + url);
  };
  return {
    request,
    get createCount() {
      return createCount;
    },
    get captureCount() {
      return captureCount;
    },
    set approved(v) {
      approved = v;
    },
    set country(v) {
      country = v;
    },
    set verification(v) {
      verification = v;
    },
    set badAmount(v) {
      badAmount = v;
    },
  };
}
test('PayPal creates server-priced orders, captures only approved matched orders and records once', async () => {
  const store = storage(),
    api = paypalMock(),
    service = createCommerce({ env, store, fetchImpl: api.request });
  const request = body('paypal');
  await service.create(request);
  await service.create(request);
  assert.equal(api.createCount, 1);
  const check = { orderId: request.attemptId, checkoutToken: token, capture: true };
  assert.equal((await service.status(check)).status, 'pending');
  assert.equal(api.captureCount, 0);
  api.approved = true;
  api.country = 'US';
  await assert.rejects(service.status(check), /Shipping/);
  assert.equal(api.captureCount, 0);
  api.country = 'AU';
  api.badAmount = true;
  await assert.rejects(service.status(check), /does not match/);
  assert.equal(api.captureCount, 0);
  api.badAmount = false;
  assert.equal((await service.status(check)).status, 'paid');
  await service.status(check);
  assert.equal(api.captureCount, 1);
});
test('PayPal rejects unverified webhooks', async () => {
  const api = paypalMock();
  api.verification = 'FAILURE';
  const service = createCommerce({ env, store: storage(), fetchImpl: api.request });
  await assert.rejects(
    service.paypalWebhook(
      new Request('https://roundone.example/webhook', {
        method: 'POST',
        body: JSON.stringify({ event_type: 'PAYMENT.CAPTURE.COMPLETED' }),
      }),
    ),
    /signature/,
  );
});
test('Server request boundary rejects cross-origin and non-JSON requests', async () => {
  await assert.rejects(
    readBody(
      new Request('https://roundone.example/api', {
        method: 'POST',
        headers: { origin: 'https://attacker.example', 'content-type': 'application/json' },
        body: '{}',
      }),
      config(env),
    ),
    /did not come/,
  );
  await assert.rejects(
    readBody(
      new Request('https://roundone.example/api', {
        method: 'POST',
        headers: { origin: env.SITE_URL, 'content-type': 'text/plain' },
        body: '{}',
      }),
      config(env),
    ),
    /JSON/,
  );
});
