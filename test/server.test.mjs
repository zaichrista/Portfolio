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

  it('serves legal and accessibility pages', async () => {
    const pages = ['privacy.html', 'cookies.html', 'terms.html', 'accessibility.html'];
    for (const page of pages) {
      const response = await fetch(`${baseUrl}/${page}`);
      assert.equal(response.status, 200, page);
    }
  });

  it('serves the one-page portfolio and separate Studio page', async () => {
    const homeResponse = await fetch(`${baseUrl}/index.html`);
    assert.equal(homeResponse.status, 200);
    const home = await homeResponse.text();
    assert.match(home, /data-scroll-section="home"/);
    assert.match(home, /data-scroll-section="about"/);
    assert.match(home, /data-scroll-section="archive"/);
    assert.match(home, /data-scroll-section="substack"/);
    assert.doesNotMatch(home, /href="\/studio\.html"/);
    assert.match(home, /class="closing-placeholder substack-editorial"/);
    assert.match(home, /class="substack-intro">And I write too<\/p>/);
    assert.match(home, /zaiinprogress\.substack\.com\/p\/my-spoon-cant-be-bent/);
    assert.match(home, /zaiinprogress\.substack\.com\/subscribe/);
    assert.doesNotMatch(home, /data-substack-feed/);
    assert.match(home, /data-legal-document="privacy"/);
    assert.match(home, /class="footer-legal-reader"/);
    assert.match(home, /src="\.\/legal\.js\?v=\d+"/);
    assert.equal((home.match(/class="project-card(?: [^"]+)?" id="brand-strategy-\d+"/g) || []).length, 2);
    assert.equal((home.match(/class="project-card(?: [^"]+)?" id="design-\d+"/g) || []).length, 5);
    assert.equal((home.match(/class="project-card(?: [^"]+)?" id="research-\d+"/g) || []).length, 4);
    assert.match(home, /class="archive-edition"/);
    assert.match(home, /class="archive-edition" aria-hidden="true">THE ARCHIVE · VOL\. 01 · 2026<\/p>/);
    assert.match(home, /class="discipline-label discipline-label-brand"><span class="discipline-label-content">BRAND STRATEGY<\/span>/);
    assert.match(home, /class="discipline-label discipline-label-design"/);
    assert.match(home, /class="discipline-label discipline-label-research"/);
    assert.doesNotMatch(home, /archive-folio|discipline-brand-second|11 STORIES/);
    const researchColumn = home.match(/aria-label="Research projects">([\s\S]*?)<\/section>/)?.[1] || '';
    assert.doesNotMatch(researchColumn, /project-placeholder/);
    assert.match(home, /class="project-editorial-masthead"/);
    assert.match(home, /class="project-editorial-head"/);
    assert.match(home, /id="project-modal-title"/);
    assert.doesNotMatch(home, /AËSOP|Aesop built a global brand/);

    assert.match(homeResponse.headers.get('content-security-policy'), /substack-post-media\.s3\.amazonaws\.com/);

    const legalScriptResponse = await fetch(`${baseUrl}/legal.js`);
    assert.equal(legalScriptResponse.status, 200);
    assert.match(await legalScriptResponse.text(), /zaira-christa-privacy-choice-v1/);

    const studioResponse = await fetch(`${baseUrl}/studio.html`);
    assert.equal(studioResponse.status, 200);
    const studio = await studioResponse.text();
    assert.match(studio, /href="\.\/index\.html\?from=studio&amp;section=about#about"/);
    assert.match(studio, /href="\.\/index\.html\?from=studio&amp;section=archive#archive"/);
    assert.match(studio, /href="\.\/index\.html\?from=studio&amp;section=substack#substack"/);
  });

  it('does not serve removed standalone section pages', async () => {
    for (const page of ['about.html', 'archive.html', 'substack.html', 'archive.js']) {
      const response = await fetch(`${baseUrl}/${page}`);
      assert.equal(response.status, 404, page);
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
