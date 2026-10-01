// Server-only correction of false positives. Never disable site-wide filtering.
// A form name/order ID alone is NOT payment proof: require the original private
// webhook notification snapshot, paid receipt and an exact field match.
const clean = (value) => String(value ?? '').replace(/\r\n/g, '\n');
const orderIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function reviewPaidOrderSpam({ store, env = process.env }) {
  const token = env.NETLIFY_FORMS_TOKEN;
  const siteId = env.NETLIFY_FORMS_SITE_ID || env.SITE_ID;
  if (!token || !siteId) {
    console.warn('Paid-order spam review: configure NETLIFY_FORMS_TOKEN and NETLIFY_FORMS_SITE_ID.');
    return;
  }
  const started = Date.now();
  const read = (key) => store.get(key, { type: 'json', consistency: 'strong' });
  async function api(path, method = 'GET') {
    const response = await fetch('https://api.netlify.com/api/v1' + path, {
      method,
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
      redirect: 'error',
    });
    if (!response.ok) throw new Error('NETLIFY_API_HTTP_' + response.status);
    return method === 'GET' ? response.json() : null;
  }
  const forms = await api('/sites/' + encodeURIComponent(siteId) + '/forms');
  const form = forms.find((entry) => entry.name === 'paid-order');
  if (!form) {
    console.warn('Paid-order spam review: paid-order form is not detected on this site.');
    return;
  }
  // Gather first, then change states: moving rows during pagination would skip entries.
  const candidates = [];
  for (let page = 1; page <= 5 && Date.now() - started < 12000; page++) {
    const rows = await api('/forms/' + encodeURIComponent(form.id) +
      '/submissions?state=spam&per_page=100&page=' + page);
    candidates.push(...rows);
    if (rows.length < 100) break;
  }
  for (const submission of candidates) {
    // Leave headroom within the scheduled-function runtime limit.
    if (Date.now() - started > 20000) break;
    const data = submission.data || {};
    const id = data.order_id;
    if (typeof id !== 'string' || !orderIdPattern.test(id)) continue;
    if (submission.form_id && submission.form_id !== form.id) continue;
    const [notification, payment, order] = await Promise.all([
      read('paid-order-forms/' + id), read('payments/' + id), read('orders/' + id),
    ]);
    if (!notification?.fields || !payment || !order || payment.orderId !== id ||
        notification.orderId !== id || order.id !== id || payment.provider !== order.provider ||
        payment.currency !== order.currency || payment.totalCents !== order.totalCents ||
        !payment.transactionId || !payment.providerId ||
        notification.fields.transaction_id !== payment.transactionId ||
        notification.fields.provider_order_id !== payment.providerId ||
        notification.fields.currency !== payment.currency ||
        notification.fields.total_paid !== (payment.totalCents / 100).toFixed(2)) continue;
    const expected = Object.entries(notification.fields).filter(([key]) =>
      !['form-name', 'bot-field', 'subject'].includes(key));
    if (!expected.length || expected.some(([key, value]) => clean(data[key]) !== clean(value))) continue;

    // One promotion attempt per order, including concurrent job runs. This also
    // prevents promoting two replayed copies of the same paid-order submission.
    const key = 'paid-order-spam-reviews/' + id;
    const review = { orderId: id, submissionId: submission.id, status: 'promoting',
      attemptedAt: new Date().toISOString() };
    const reserved = await store.setJSON(key, review, { onlyIfNew: true });
    if (!reserved.modified) continue;
    try {
      await api('/submissions/' + encodeURIComponent(submission.id) + '/ham', 'PUT');
      await store.setJSON(key, { ...review, status: 'verified', finishedAt: new Date().toISOString() });
      console.info('Paid-order false positive corrected:', id);
    } catch {
      // An uncertain response is not retried blindly: changing state twice could
      // repeat a notification. Keep the original submission and payment intact.
      await store.setJSON(key, { ...review, status: 'needs_review',
        errorCode: 'PROMOTION_FAILED_OR_UNCERTAIN', finishedAt: new Date().toISOString() });
      console.error('Paid-order spam correction needs review:', id);
    }
  }
}
