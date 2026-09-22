import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import source from '../products.json' with { type: 'json' };
import paths from '../lib/image-manifest.json' with { type: 'json' };
import data from '../lib/catalogue-data.json' with { type: 'json' };
import { adaptCatalogue, priceCents } from '../lib/catalogue.mjs';
const require = createRequire(import.meta.url);
const { create } = require('../dist/cart-core.js');
test('All source entries and descriptions are preserved; correct fixed sizes and colour variants', () => {
  assert.equal(Object.keys(data).length, 20);
  assert.deepEqual(data, adaptCatalogue(source, paths));
  for (const [id, p] of Object.entries(data)) {
    assert.equal(p.name, source[id].title);
    assert.deepEqual(p.description, source[id].description);
    assert.equal(p.sku, source[id].sku);
    assert.equal(p.stripePriceId, source[id].stripePriceId);
  }
  assert.equal(data.gloves1.variants[0].size, '16oz');
  assert.equal(data.gloves7.variants.length, 9);
  assert.equal(data.gloves5.priceCents, 99);
  assert.equal(data.glovestest.priceCents, 1);
});
test('Five missing mappings stay unavailable; every available photo exists', () => {
  assert.equal(
    Object.values(data)
      .flatMap((p) => p.variants)
      .filter((v) => !v.available).length,
    5,
  );
  assert.equal(data.gloves11.available, false);
  assert.equal(data.gloves7.variants.find((v) => v.colour === 'Cyan').available, false);
  for (const p of Object.values(data))
    for (const v of p.variants)
      if (v.available) assert(fs.existsSync(new URL('../' + v.image, import.meta.url)));
});
test('Source price parsing rejects invalid amounts', () => {
  assert.equal(priceCents('$339.99'), 33999);
  for (const p of ['free', '0.99', '-$1', '$1.999', '$NaN']) assert.throws(() => priceCents(p));
});
test('Cart merges matching variants, separates colours, totals and removes', () => {
  const core = create(data);
  let rows = core.add([], 'gloves7', 'red-12oz', 2).rows;
  rows = core.add(rows, 'gloves7', 'red-12oz', 1).rows;
  rows = core.add(rows, 'gloves7', 'blue-12oz', 1).rows;
  assert.equal(rows.length, 2);
  assert.equal(core.summary(rows).subtotalCents, 55996);
  rows = core.setQuantity(rows, 'gloves7', 'red-12oz', 1).rows;
  assert.equal(core.summary(rows).count, 2);
  rows = core.remove(rows, 'gloves7', 'red-12oz');
  rows = core.remove(rows, 'gloves7', 'blue-12oz');
  assert.equal(core.summary(rows).subtotalCents, 0);
  for (const [id, variant] of [
    ['gloves11', 'black-10oz'],
    ['gloves7', 'cyan-12oz'],
    ['glovestest', 'black-16oz'],
    ['__proto__', 'x'],
  ])
    assert.equal(core.add([], id, variant).ok, false);
  assert.equal(core.add([], 'bag1', 'black', 100).ok, false);
  assert.equal(
    core.summary([{ productId: 'bag1', variantId: 'black', quantity: 1, priceCents: 1 }])
      .subtotalCents,
    33999,
  );
});
test('Shared storage survives navigation and handles blocked storage', () => {
  const memory = new Map();
  let handler;
  const make = (blocked) => {
    const ctx = {
      RoundOneCartCore: { create },
      roundOneProducts: data,
      localStorage: {
        getItem: (k) => memory.get(k),
        setItem: (k, v) => {
          if (blocked) throw Error('blocked');
          memory.set(k, v);
        },
      },
      CustomEvent: class {
        constructor(type) {
          this.type = type;
        }
      },
      addEventListener: (name, fn) => {
        if (name === 'storage') handler = fn;
      },
      dispatchEvent: () => {},
    };
    ctx.window = ctx;
    vm.runInNewContext(
      fs.readFileSync(new URL('../dist/cart-state.js', import.meta.url), 'utf8'),
      ctx,
    );
    return ctx.RoundOneCart;
  };
  const first = make(false);
  first.add('bag1', 'black');
  const second = make(false);
  assert.equal(second.summary().count, 1);
  second.remove('bag1', 'black');
  handler({ key: 'round-one-cart-v1' });
  assert.equal(second.summary().count, 0);
  const blocked = make(true);
  assert.equal(blocked.add('bag1', 'black').persistent, false);
  assert.equal(blocked.summary().count, 1);
});
