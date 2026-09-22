import { createCommerce } from '../../lib/payments.mjs';
import { json, errorResponse } from '../../lib/http.mjs';
export default async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  try {
    return json(await createCommerce().paypalWebhook(request));
  } catch (error) {
    return errorResponse(error);
  }
};
