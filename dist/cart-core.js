/* Pure catalogue-backed cart calculations. Payment totals must be validated on a server. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RoundOneCartCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const MAX_QUANTITY = 99;
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  function create(catalogue) {
    function resolve(productId, variantId) {
      if (typeof productId !== 'string' || !own(catalogue, productId)) return null;
      const product = catalogue[productId];
      if (
        product.testOnly ||
        product.placeholder ||
        product.available === false ||
        !Number.isSafeInteger(product.priceCents) ||
        product.priceCents < 0
      )
        return null;
      const variant = (product.variants || []).find((item) => item.id === variantId);
      if (!variant || variant.available === false) return null;
      const priceCents = variant.priceCents ?? product.priceCents;
      if (!Number.isSafeInteger(priceCents) || priceCents < 0) return null;
      const caps = [MAX_QUANTITY, product.stock, variant.stock].filter(Number.isSafeInteger);
      const max = Math.max(0, Math.min(...caps));
      if (max < 1) return null;
      return { product, variant, priceCents, max };
    }
    const key = (row) => JSON.stringify([row.productId, row.variantId]);
    function normalise(input) {
      const merged = new Map();
      if (!Array.isArray(input)) return [];
      for (const row of input) {
        if (
          !row ||
          typeof row !== 'object' ||
          !Number.isSafeInteger(row.quantity) ||
          row.quantity < 1
        )
          continue;
        const info = resolve(row.productId, row.variantId);
        if (!info) continue;
        const id = key(row);
        const previous = merged.get(id)?.quantity || 0;
        merged.set(id, {
          productId: row.productId,
          variantId: row.variantId,
          quantity: Math.min(info.max, previous + row.quantity),
        });
      }
      // Product stock, when supplied, applies across all variants of that product.
      const allocated = new Map();
      const output = [];
      for (const row of merged.values()) {
        const product = catalogue[row.productId];
        const used = allocated.get(row.productId) || 0;
        const quantity = Number.isSafeInteger(product.stock)
          ? Math.min(row.quantity, Math.max(0, product.stock - used))
          : row.quantity;
        if (quantity > 0) {
          output.push({ ...row, quantity });
          allocated.set(row.productId, used + quantity);
        }
      }
      return output;
    }
    function summary(input) {
      const rows = normalise(input);
      const items = rows.map((row) => {
        const info = resolve(row.productId, row.variantId);
        return { ...row, ...info, lineCents: info.priceCents * row.quantity };
      });
      return {
        rows,
        items,
        count: items.reduce((n, item) => n + item.quantity, 0),
        subtotalCents: items.reduce((n, item) => n + item.lineCents, 0),
        containsPreview: items.some((item) => item.product.cataloguePreview === true),
      };
    }
    function limitFor(rows, productId, variantId) {
      const info = resolve(productId, variantId);
      if (!info) return 0;
      const other = normalise(rows)
        .filter((row) => row.productId === productId && row.variantId !== variantId)
        .reduce((sum, row) => sum + row.quantity, 0);
      return Number.isSafeInteger(info.product.stock)
        ? Math.min(info.max, Math.max(0, info.product.stock - other))
        : info.max;
    }
    function add(input, productId, variantId, quantity = 1) {
      const rows = normalise(input);
      const info = resolve(productId, variantId);
      if (!info) return { ok: false, rows, message: 'This product is not available to add yet.' };
      if (!Number.isSafeInteger(quantity) || quantity < 1)
        return { ok: false, rows, message: 'Choose a whole-number quantity of at least one.' };
      const current =
        rows.find((row) => row.productId === productId && row.variantId === variantId)?.quantity ||
        0;
      if (current + quantity > limitFor(rows, productId, variantId))
        return { ok: false, rows, message: 'The available quantity limit has been reached.' };
      return {
        ok: true,
        rows: normalise([...rows, { productId, variantId, quantity }]),
        message: 'Added to your cart.',
      };
    }
    function setQuantity(input, productId, variantId, quantity) {
      const rows = normalise(input);
      const max = limitFor(rows, productId, variantId);
      if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > max)
        return {
          ok: false,
          rows,
          message:
            quantity < 1
              ? 'Use Remove to remove this item.'
              : `Choose a whole-number quantity between 1 and ${max}.`,
        };
      return {
        ok: true,
        rows: rows.map((row) =>
          row.productId === productId && row.variantId === variantId ? { ...row, quantity } : row,
        ),
        message: 'Quantity updated.',
      };
    }
    function remove(input, productId, variantId) {
      return normalise(input).filter(
        (row) => row.productId !== productId || row.variantId !== variantId,
      );
    }
    function checkoutItems(input) {
      return normalise(input).map(({ productId, variantId, quantity }) => ({
        productId,
        variantId,
        quantity,
      }));
    }
    return { resolve, normalise, summary, add, setQuantity, remove, limitFor, checkoutItems };
  }
  return { create, MAX_QUANTITY };
});
