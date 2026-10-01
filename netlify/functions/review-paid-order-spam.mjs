// Private scheduled job; no new public endpoint for approving form submissions.
import { createCommerce } from '../../lib/payments.mjs';
export const config = { schedule: '*/5 * * * *' };
export default async () => {
  try {
    await createCommerce().reviewPaidOrderSpam();
  } catch {
    console.error('Paid-order spam review could not finish. Check Netlify API access and private storage.');
  }
  return new Response(null, { status: 204 });
};
