import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { adaptCatalogue } from '../lib/catalogue.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const source = JSON.parse(fs.readFileSync(path.join(root, 'products.json'), 'utf8'));
function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}
const paths = walk(path.join(root, 'images'))
  .filter((p) => /\.(png|jpe?g|webp|avif)$/i.test(p))
  .map((p) => path.relative(root, p).split(path.sep).join('/'));
const catalogue = adaptCatalogue(source, paths);
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch],
  );
const e = escape;
function card(p) {
  const initial = p.variants.find((v) => v.available) || p.variants[0];
  return `<article class="product catalogue-product" data-category="${e(p.category)}" data-product-card="${e(p.id)}">
 <button class="product-visual" type="button" data-product="${e(p.id)}" aria-label="View ${e(p.name)}">${p.image ? `<img src="/${e(p.image)}" alt="${e(p.name)}" loading="lazy">` : '<span class="image-unavailable">Product photo unavailable</span>'}<span class="product-tag">${p.testOnly ? 'TEST ENTRY' : e(p.brand)}</span></button>
 <div class="product-meta"><div><span class="product-category">${e(p.category.toUpperCase())}</span><h3><button type="button" data-product="${e(p.id)}">${e(p.name)}</button></h3></div><span class="price">${e(p.price)}</span></div>
 <div class="card-cart-actions"><label class="sr-only" for="variant-${e(p.id)}">Choose colour and size for ${e(p.name)}</label><select id="variant-${e(p.id)}" data-card-variant="${e(p.id)}">${p.variants.map((v) => `<option value="${e(v.id)}" ${v.id === initial.id ? 'selected' : ''} ${!v.available ? 'disabled' : ''}>${e(v.label)}${!v.available ? ' - unavailable' : ''}</option>`).join('')}</select><button class="card-add-button" type="button" data-add-product="${e(p.id)}" ${!p.available || p.testOnly ? 'disabled' : ''}>${p.testOnly ? 'TEST ITEM - NOT FOR SALE' : p.available ? 'ADD TO CART <span aria-hidden="true">+</span>' : 'UNAVAILABLE'}</button></div></article>`;
}
for (const file of ['dist/index.html', 'dist/shop/index.html']) {
  const filename = path.join(root, file);
  let html = fs.readFileSync(filename, 'utf8');
  if (!html.includes('<!-- CATALOGUE:START -->'))
    html = html.replace(
      /<div class="product-grid">[\s\S]*?(?=<p class="catalog-note")/,
      '<!-- CATALOGUE:START -->\n<!-- CATALOGUE:END -->\n',
    );
  if (!html.includes('<!-- CATALOGUE:START -->'))
    throw new Error(`Catalogue marker missing in ${file}`);
  html = html.replace(
    /<!-- CATALOGUE:START -->[\s\S]*?<!-- CATALOGUE:END -->/,
    `<!-- CATALOGUE:START -->\n<div class="product-grid">${Object.values(catalogue).map(card).join('\n')}</div>\n<!-- CATALOGUE:END -->`,
  );
  for (const category of ['all', 'gloves', 'bags', 'pads']) {
    const count = Object.values(catalogue).filter(
      (p) => category === 'all' || p.category === category,
    ).length;
    const rx = new RegExp(`(data-filter="${category}"[^>]*>[\\s\\S]*?<span>)[\\s\\S]*?(</span>)`);
    html = html.replace(rx, (_match, before, after) => before + count + after);
  }
  html = html.replace(
    /<p class="catalog-note">[\s\S]*?<\/p>/,
    '<p class="catalog-note">Prices in AUD. Choose your colour before adding equipment to your cart.</p>',
  );
  fs.writeFileSync(filename, html);
}
fs.rmSync(path.join(root, 'dist/images'), { recursive: true, force: true });
fs.cpSync(path.join(root, 'images'), path.join(root, 'dist/images'), { recursive: true });
fs.copyFileSync(path.join(root, 'products.json'), path.join(root, 'dist/products.json'));
fs.writeFileSync(
  path.join(root, 'dist/products.js'),
  '// Generated from products.json and images/. Edit the originals, then run npm run build.\nwindow.roundOneProducts = ' +
    JSON.stringify(catalogue, null, 2) +
    ';\n',
);
fs.writeFileSync(path.join(root, 'lib/image-manifest.json'), JSON.stringify(paths, null, 2) + '\n');
fs.writeFileSync(
  path.join(root, 'lib/catalogue-data.json'),
  JSON.stringify(catalogue, null, 2) + '\n',
);
const missing = Object.values(catalogue).flatMap((p) =>
  p.missingImages.map((variant) => ({ product: p.id, variant })),
);
console.log(
  `Built ${Object.keys(catalogue).length} catalogue entries and ${paths.length} images. ${missing.length} variants unavailable because their images are missing.`,
);
