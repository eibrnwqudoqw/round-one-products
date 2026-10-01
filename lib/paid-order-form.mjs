// Server-only Netlify Forms notification. Called only by verified paid webhooks.
// Netlify Forms has no submission idempotency key, so reserve one POST per order
// atomically in the existing private store before making any network request.
const supplied = (value) => typeof value === 'string' && value.trim() ? value.trim() : 'Not supplied';
const amount = (cents) => (cents / 100).toFixed(2);

function orderFields(order, payment, paymentMode) {
  const paypal = order.provider === 'paypal';
  const customer = payment.customer || {};
  const shipping = payment.shipping || {};
  const address = shipping.address || {};
  const customerName = paypal
    ? [customer.name?.given_name, customer.name?.surname].filter(Boolean).join(' ')
    : customer.name;
  const recipient = paypal ? shipping.name?.full_name : shipping.name;
  const line1 = paypal ? address.address_line_1 : address.line1;
  const line2 = paypal ? address.address_line_2 : address.line2;
  const city = paypal ? address.admin_area_2 : address.city;
  const state = paypal ? address.admin_area_1 : address.state;
  const country = paypal ? address.country_code : address.country;
  const items = order.lines.map((item, index) => {
    // Checkout already stores the selected "Colour · Size" label. Read that
    // immutable snapshot, not a catalogue that may have changed since purchase.
    const [colour, ...size] = (item.variant || '').split(' · ');
    return [
      `ITEM ${index + 1}: ${item.name}`,
      `Product ID: ${item.productId}`,
      `SKU: ${supplied(item.sku)}`,
      `Colour: ${supplied(colour)}`,
      `Size/weight: ${size.join(' · ') || 'Not applicable / not supplied'}`,
      `Selected variant: ${supplied(item.variant)}`,
      `Variant ID: ${item.variantId}`,
      `Quantity: ${item.quantity}`,
      `Unit price: ${amount(item.unitCents)} ${order.currency}`,
      `Line total: ${amount(item.unitCents * item.quantity)} ${order.currency}`,
    ].join('\n');
  }).join('\n\n');

  const fields = {
    'form-name': 'paid-order',
    'bot-field': '',
    subject: `${paymentMode === 'live' ? '' : '[TEST — DO NOT FULFIL] '}Round One paid order ${order.id}`,
    order_id: order.id,
    payment_method: paypal ? 'PayPal' : 'Stripe',
    transaction_id: supplied(payment.transactionId),
    provider_order_id: supplied(payment.providerId),
    payment_status: 'Paid — verified by server-side webhook',
    payment_environment: paymentMode,
    payment_verified_at: supplied(payment.paidAt),
    name: supplied(customerName),
    email: paypal ? customer.email_address || '' : customer.email || '',
    phone: supplied(order.customerPhone || payment.customerPhone ||
      (paypal ? customer.phone?.phone_number?.national_number : customer.phone)),
    delivery_recipient: supplied(recipient),
    delivery_address: [recipient, line1, line2, city, state, address.postal_code, country]
      .filter(Boolean).join('\n') || 'Not supplied',
    address_line_1: supplied(line1),
    address_line_2: supplied(line2),
    suburb_city: supplied(city),
    state: supplied(state),
    postcode: supplied(address.postal_code),
    country: supplied(country),
    products: items,
    subtotal: amount(order.subtotalCents),
    shipping: amount(order.shippingCents),
    total_paid: amount(payment.totalCents),
    currency: order.currency,
  };
  // A complete readable summary is also the first textarea in the static form.
  fields.order_details = Object.entries(fields)
    .filter(([key]) => !['form-name', 'bot-field', 'subject'].includes(key))
    .map(([key, value]) => `${key.replaceAll('_', ' ').toUpperCase()}: ${value || 'Not supplied'}`)
    .join('\n\n');
  return fields;
}

export async function submitPaidOrderForm({ store, origin, order, payment, paymentMode }) {
  if (!order || !payment || payment.orderId !== order.id || payment.provider !== order.provider ||
      payment.totalCents !== order.totalCents || payment.currency !== order.currency)
    throw new Error('A matching verified paid record is required for the order form.');
  const destination = new URL('/paid-order/', origin);
  if (destination.protocol !== 'https:')
    throw new Error('The order form requires the configured HTTPS site URL.');

  const key = 'paid-order-forms/' + order.id;
  const fields = orderFields(order, payment, paymentMode);
  const record = {
    orderId: order.id,
    status: 'posting',
    attemptedAt: new Date().toISOString(),
    fields,
  };
  // Atomic create, not "read then write": simultaneous events cannot both win.
  const reserved = await store.setJSON(key, record, { onlyIfNew: true });
  if (!reserved.modified) return;

  let result;
  try {
    const response = await fetch(destination, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(fields).toString(),
      // Do not follow redirects to another hostname or replay the POST.
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
    });
    const accepted = response.ok || response.status === 303;
    result = {
      ...record,
      status: accepted ? 'submitted' : 'needs_review',
      finishedAt: new Date().toISOString(),
      httpStatus: response.status,
      errorCode: accepted ? null : 'FORM_HTTP_ERROR',
    };
  } catch {
    // A timeout may follow a successful receipt by Netlify. Retrying blindly
    // could generate duplicate emails; retain the reservation for manual review.
    result = { ...record, status: 'needs_review', finishedAt: new Date().toISOString(),
      errorCode: 'FORM_REQUEST_FAILED_OR_UNCERTAIN' };
  }
  try {
    await store.setJSON(key, result);
  } catch {
    // The initial durable reservation still prevents a duplicate after a crash.
    console.error('Paid-order form result needs review:', order.id, 'RESULT_STORAGE_FAILED');
  }
  if (result.status === 'needs_review')
    console.error('Paid-order form needs review:', order.id, result.errorCode, result.httpStatus || '');
}
