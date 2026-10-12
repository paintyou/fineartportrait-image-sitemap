import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildXml, fetchPublishedItems } from '../lib/sitemap.mjs';
import { GET } from '../app/portrait-image-sitemap.xml/route.js';

const image = (name) => ({ url: `https://cdn.prod.website-files.com/collection/${name}.webp` });
const portrait = (slug, extra = {}) => ({
  fieldData: { slug, 'main-portrait-image': image(slug), ...extra }
});

test('XML includes all three image fields, deduplicates, escapes URLs, and excludes unpublished items', () => {
  const main = image('main');
  const detail = { url: `${image('detail').url}?a=1&b=2` };
  const xml = buildXml([
    portrait('sample', {
      'main-portrait-image': main,
      'featured-detail-image': image('featured'),
      'detail-images': [main, detail, { url: 'https://untrusted.example/image.jpg' }, null]
    }),
    { ...portrait('draft'), isDraft: true },
    { ...portrait('archived'), isArchived: true },
    portrait('empty', { 'main-portrait-image': null }),
    { fieldData: {} }
  ]);
  assert.equal((xml.match(/<url>/g) ?? []).length, 1);
  assert.equal((xml.match(/<image:image>/g) ?? []).length, 3);
  assert.ok(xml.includes('https://www.fineartportrait.com/portrait-gallery/sample'));
  assert.ok(xml.includes('?a=1&amp;b=2'));
  assert.ok(!xml.includes('untrusted.example'));
  assert.ok(xml.includes('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'));
});

test('published CMS reads paginate and use authenticated GET without caching', async (t) => {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url, options });
    const items = requests.length === 1
      ? Array.from({ length: 100 }, (_, i) => portrait(`p-${i}`))
      : [portrait('last')];
    return Response.json({ items, pagination: { total: 101 } });
  });
  assert.equal((await fetchPublishedItems('test-only-token')).length, 101);
  assert.equal(requests.length, 2);
  assert.ok(requests[0].url.includes('/items/live?limit=100&offset=0'));
  assert.ok(requests[1].url.endsWith('offset=100'));
  assert.equal(requests[0].options.headers.Authorization, 'Bearer test-only-token');
  assert.equal(requests[0].options.cache, 'no-store');
});

test('CMS failures reject instead of returning an empty sitemap', async (t) => {
  await assert.rejects(fetchPublishedItems(), /not configured/);
  t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 401 }));
  await assert.rejects(fetchPublishedItems('test-only-token'), /401/);
  t.mock.method(globalThis, 'fetch', async () => Response.json({ unexpected: [] }));
  await assert.rejects(fetchPublishedItems('test-only-token'), /missing items/);
});

test('route returns XML on success and uncached 503 on configuration or upstream failure', async (t) => {
  const previous = process.env.WEBFLOW_API_TOKEN;
  t.after(() => {
    if (previous === undefined) delete process.env.WEBFLOW_API_TOKEN;
    else process.env.WEBFLOW_API_TOKEN = previous;
  });
  t.mock.method(console, 'error', () => {});
  delete process.env.WEBFLOW_API_TOKEN;
  let response = await GET();
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  process.env.WEBFLOW_API_TOKEN = 'test-only-token';
  t.mock.method(globalThis, 'fetch', async () => Response.json({ items: [portrait('sample')] }));
  response = await GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/xml; charset=utf-8');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.ok((await response.text()).includes('<image:loc>'));
  t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 429 }));
  response = await GET();
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(await response.text(), 'Sitemap temporarily unavailable');
});
