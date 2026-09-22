// Validate generated catalogue pages, preserved source assets and browser-ready code.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const project = fileURLToPath(new URL('../', import.meta.url));
const root = path.join(project, 'dist');
function walk(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? walk(path.join(directory, entry.name))
        : [path.join(directory, entry.name)],
    );
}
const files = walk(root);
const htmlFiles = files.filter((file) => file.endsWith('.html'));
const decode = (value) => value.replaceAll('&amp;', '&');
function localTarget(ref, file) {
  if (!ref || /^(https?:|data:|mailto:|tel:|javascript:|\/\/)/i.test(ref)) return null;
  const url = new URL(
    decode(ref),
    'https://local.test/' + path.relative(root, file).split(path.sep).join('/'),
  );
  let target = path.join(root, decodeURIComponent(url.pathname));
  if (fs.existsSync(target) && fs.statSync(target).isDirectory())
    target = path.join(target, 'index.html');
  assert(fs.existsSync(target), `Missing ${ref} in ${path.relative(root, file)}`);
  if (url.hash && target.endsWith('.html')) {
    const text = fs.readFileSync(target, 'utf8');
    const ids = [...text.matchAll(/\bid\s*=\s*["']([^"']+)["']/g)].map((match) => match[1]);
    assert(ids.includes(decodeURIComponent(url.hash.slice(1))), `Missing anchor ${ref}`);
  }
  return target;
}
for (const file of htmlFiles) {
  const text = fs.readFileSync(file, 'utf8');
  assert(/<title>[^<]+<\/title\s*>/i.test(text), `Missing title: ${file}`);
  for (const match of text.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/g))
    localTarget(match[1], file);
  for (const match of text.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi)) {
    if (!/\bsrc\s*=/.test(match[1] || '') && !/application\/ld\+json/.test(match[1] || ''))
      new vm.Script(match[2], { filename: file });
  }
}
for (const file of files.filter((file) => file.endsWith('.css'))) {
  for (const match of fs.readFileSync(file, 'utf8').matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g))
    localTarget(match[1].trim(), file);
}
for (const file of files.filter((file) => file.endsWith('.js')))
  execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'products.js'), 'utf8'), context);
for (const [id, product] of Object.entries(context.window.roundOneProducts)) {
  assert.equal(product.id, id, `Catalogue key and id must agree: ${id}`);
  if (product.image)
    assert(fs.existsSync(path.join(root, product.image)), `Missing product image: ${id}`);
  for (const variant of product.variants)
    if (variant.available)
      assert(
        variant.image && fs.existsSync(path.join(root, variant.image)),
        `Missing variant image: ${id}/${variant.id}`,
      );
  const variants = product.variants || [];
  assert.equal(
    new Set(variants.map((variant) => variant.id)).size,
    variants.length,
    `Duplicate variant: ${id}`,
  );
}
for (const route of [
  '',
  'personal-training',
  'shop',
  'about',
  'contact',
  'cart',
  'online-coaching',
  'checkout',
])
  assert(fs.existsSync(path.join(root, route, 'index.html')), `Missing page ${route}`);
console.log(
  `Source verified: ${htmlFiles.length} HTML pages, ${files.length} public files; local links, anchors, assets and JavaScript syntax passed.`,
);
for (const directory of ['lib', 'netlify/functions'])
  for (const file of walk(path.join(project, directory)).filter((f) => f.endsWith('.mjs')))
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
console.log('Static output ready in dist/. Netlify bundles the functions during deployment.');
