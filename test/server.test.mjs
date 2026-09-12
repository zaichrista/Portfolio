import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { createApp } from '../src/server.mjs';

let server;
let baseUrl;

before(async () => {
  server = createApp({ production: false, contactEnabled: false });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (!server?.listening) return;
  await new Promise((resolve, reject) => {
    server.closeAllConnections();
    server.close((error) => error ? reject(error) : resolve());
  });
});

describe('portfolio server', () => {
  it('reports health without disclosing internals', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.match(response.headers.get('content-security-policy'), /default-src 'self'/);
  });

  it('serves legal pages', async () => {
    const response = await fetch(`${baseUrl}/privacy.html`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Privacy policy/);
  });

  it('serves all five portfolio pages with shared navigation', async () => {
    const pages = ['index.html', 'about.html', 'studio.html', 'archive.html', 'substack.html'];
    for (const page of pages) {
      const response = await fetch(`${baseUrl}/${page}`);
      assert.equal(response.status, 200, page);
      const html = await response.text();
      assert.match(html, /aria-label="Primary navigation"/, page);
      for (const target of pages) assert.match(html, new RegExp(`href="/${target}"`), `${page} links to ${target}`);
      assert.match(html, /href="\/styles\.css"/, page);
    }
  });

  it('blocks traversal and unknown files', async () => {
    const response = await fetch(`${baseUrl}/%2e%2e/package.json`);
    assert.equal(response.status, 404);
  });

  it('keeps contact disabled without delivery credentials', async () => {
    const response = await fetch(`${baseUrl}/api/contact`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' },
      body: '{}'
    });
    assert.equal(response.status, 503);
  });

  it('does not expose stack traces', async () => {
    const response = await fetch(`${baseUrl}/missing`);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'Not found.' });
  });
});
