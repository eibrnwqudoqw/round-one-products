// Confirm the independent local server serves every exported page/asset.
import fs from 'node:fs';
import path from 'node:path';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
process.env.PORT = '0';
const { server } = await import('../scripts/serve.mjs');
if (!server.listening) await once(server, 'listening');
const origin = `http://127.0.0.1:${server.address().port}`;
const root = fileURLToPath(new URL('../dist/', import.meta.url));
function walk(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? walk(path.join(directory, entry.name))
        : [path.join(directory, entry.name)],
    );
}
try {
  for (const file of walk(root).filter(
    (file) =>
      !path
        .relative(root, file)
        .split(path.sep)
        .some((part) => part.startsWith('.')),
  )) {
    let route = '/' + path.relative(root, file).split(path.sep).join('/');
    if (route.endsWith('index.html')) route = route.slice(0, -10);
    const response = await fetch(origin + route);
    assert.equal(response.status, 200, route);
    assert(
      Buffer.from(await response.arrayBuffer()).equals(fs.readFileSync(file)),
      `Response differs: ${route}`,
    );
  }
  const redirect = await fetch(origin + '/shop?test=1', { redirect: 'manual' });
  assert.equal(redirect.status, 301);
  assert.equal(redirect.headers.get('location'), '/shop/?test=1');
  assert.equal((await fetch(origin + '/missing-page')).status, 404);
  assert.equal((await fetch(origin + '/.env')).status, 403);
  assert.equal((await fetch(origin + '/', { method: 'POST' })).status, 405);
  assert.match((await fetch(origin + '/products.js')).headers.get('content-type'), /javascript/);
  assert.match(
    (await fetch(origin + '/assets/hero.webp')).headers.get('content-type'),
    /image\/webp/,
  );
  console.log(
    'HTTP checks passed: every page/asset served byte-for-byte, directory redirect, MIME types, 404, secret-path rejection and unsupported-method handling.',
  );
} finally {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
