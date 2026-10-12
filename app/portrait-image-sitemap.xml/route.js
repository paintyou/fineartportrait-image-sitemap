import { buildXml, fetchPublishedItems } from '../../lib/sitemap.mjs';

// OpenNext converts Next.js's Node runtime to Cloudflare Workers.
// Do not use runtime = 'edge': it is not supported by this adapter.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = await fetchPublishedItems(process.env.WEBFLOW_API_TOKEN);
    const xml = buildXml(items);

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=600',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (error) {
    console.error('Unable to generate portrait sitemap:', error.message);

    return new Response('Sitemap temporarily unavailable', {
      status: 503,
      headers: { 'Cache-Control': 'no-store' }
    });
  }
}
