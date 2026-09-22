import { createCommerce } from '../../lib/payments.mjs';
import { readBody, json, errorResponse } from '../../lib/http.mjs';
export default async (request) => {
  try {
    const service = createCommerce();
    return json(await service.create(await readBody(request, service.settings)));
  } catch (error) {
    return errorResponse(error);
  }
};
