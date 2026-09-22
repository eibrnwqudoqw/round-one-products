// DOM interaction checks. This simulates the browser DOM, not visual rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
const root = fileURLToPath(new URL('../dist/', import.meta.url));
async function page(route, stored) {
  const dom = new JSDOM(fs.readFileSync(path.join(root, route, 'index.html'), 'utf8'), {
    url: 'https://roundone.example/' + route + '/',
    runScripts: 'outside-only',
  });
  const w = dom.window;
  w.matchMedia = () => ({ matches: false, addEventListener: () => {} });
  w.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  w.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  w.fetch = async () => ({
    ok: true,
    json: async () => ({ stripe: false, paypal: false, shippingCents: 1200, countries: ['AU'] }),
  });
  if (stored) w.localStorage.setItem('round-one-cart-v1', stored);
  for (const script of w.document.querySelectorAll('script[src]'))
    w.eval(fs.readFileSync(path.join(root, script.getAttribute('src')), 'utf8'));
  await new Promise((resolve) => setTimeout(resolve, 10));
  return dom;
}
test('Shop filters, variant photo changes, details, missing images, cart persistence and mobile nav', async () => {
  const dom = await page('shop');
  const w = dom.window;
  const d = w.document;
  try {
    assert.equal(d.querySelectorAll('.product').length, 20);
    d.querySelector('[data-filter="bags"]').click();
    assert.equal([...d.querySelectorAll('.product')].filter((el) => !el.hidden).length, 6);
    d.querySelector('[data-filter="all"]').click();
    const select = d.querySelector('[data-card-variant="gloves7"]');
    select.value = 'blue-12oz';
    select.dispatchEvent(new w.Event('change'));
    assert.match(
      d.querySelector('[data-product-card="gloves7"] img').src,
      /images\/gloves7\/2.png$/,
    );
    assert.equal(select.querySelector('option[value="cyan-12oz"]').disabled, true);
    assert.equal(d.querySelector('[data-add-product="gloves11"]').disabled, true);
    assert.equal(d.querySelector('[data-add-product="glovestest"]').disabled, true);
    d.querySelector('[data-add-product="gloves7"]').click();
    assert.equal(w.RoundOneCart.summary().count, 1);
    assert.equal(d.querySelector('[data-cart-count]').textContent, '1');
    d.querySelector('[data-product="gloves7"]').click();
    assert.equal(d.querySelector('#detail-dialog').open, true);
    assert.match(
      d.querySelector('#dialog-content').textContent,
      /BOXING GLOVES - Trophy Getters - 12oz/,
    );
    const option = d.querySelector('#product-variant');
    option.value = 'red-12oz';
    option.dispatchEvent(new w.Event('change', { bubbles: true }));
    d.querySelector('[data-modal-add]').click();
    assert.equal(w.RoundOneCart.summary().count, 2);
    assert.equal(d.querySelector('#product-added').hidden, false);
    d.querySelector('[data-continue-shopping]').click();
    assert.equal(d.querySelector('#detail-dialog').open, false);
    d.querySelector('.nav-toggle').click();
    assert.equal(d.querySelector('.nav-toggle').getAttribute('aria-expanded'), 'true');
    const cart = await page('cart', w.localStorage.getItem('round-one-cart-v1'));
    try {
      const cd = cart.window.document;
      assert.equal(cd.querySelectorAll('.cart-item').length, 2);
      assert.equal(cd.querySelector('#cart-empty').hidden, true);
      assert.match(cd.querySelector('#cart-total').textContent, /291\.98/);
      assert.equal(cd.querySelector('[data-payment-provider="stripe"]').disabled, true);
      cd.querySelector('[data-action="increase"]').click();
      assert.equal(cart.window.RoundOneCart.summary().count, 3);
      assert.match(cd.querySelector('#cart-total').textContent, /431\.97/);
      [...cd.querySelectorAll('[data-action="remove"]')].forEach((button) => button.click());
      // Re-render replaces rows, so remove the currently rendered final row separately.
      cd.querySelector('[data-action="remove"]')?.click();
      assert.equal(cd.querySelector('#cart-empty').hidden, false);
    } finally {
      cart.window.close();
    }
  } finally {
    w.close();
  }
});
