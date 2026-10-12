export const COLLECTION_ID = '6a0b73151af4f18f817f1d23';
export const DOMAIN = 'https://www.fineartportrait.com';
export const WEBFLOW_API = 'https://api.webflow.com/v2';

const escapeXml = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const validImage = (value) => {
  if (!value || typeof value.url !== 'string') return null;
  try {
    const u = new URL(value.url);
    if (u.protocol !== 'https:') return null;
    if (!['cdn.prod.website-files.com', 'uploads-ssl.webflow.com', 'assets.website-files.com'].includes(u.hostname)) return null;
    return u.href;
  } catch { return null; }
};

export function buildXml(items) {
  const entries = [];
  for (const item of items) {
    if (item.isDraft || item.isArchived || !item.fieldData?.slug) continue;
    const f = item.fieldData;
    const images = [f['main-portrait-image'], f['featured-detail-image'], ...(Array.isArray(f['detail-images']) ? f['detail-images'] : [])];
    const urls = [...new Set(images.map(validImage).filter(Boolean))];
    if (!urls.length) continue;
    const page = `${DOMAIN}/portrait-gallery/${encodeURIComponent(f.slug)}`;
    entries.push(`  <url>\n    <loc>${escapeXml(page)}</loc>\n${urls.map((u) => `    <image:image><image:loc>${escapeXml(u)}</image:loc></image:image>`).join('\n')}\n  </url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${entries.join('\n')}\n</urlset>\n`;
}

export async function fetchPublishedItems(token) {
  if (!token) throw new Error('WEBFLOW_API_TOKEN is not configured');
  const result = [];
  const limit = 100;
  for (let offset = 0; offset < 10000; offset += limit) {
    const response = await fetch(`${WEBFLOW_API}/collections/${COLLECTION_ID}/items/live?limit=${limit}&offset=${offset}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) throw new Error(`Webflow CMS API returned ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.items)) throw new Error('Webflow CMS API response missing items');
    result.push(...data.items);
    if (data.items.length < limit || (data.pagination?.total !== undefined && result.length >= data.pagination.total)) break;
  }
  return result;
}
