import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ fontFamily: 'system-ui', maxWidth: 680, margin: '5rem auto', padding: '1rem' }}>
      <h1>Fine Art Portrait Image Sitemap</h1>
      <p>This service generates an image sitemap for the published portrait collection.</p>
      <p><Link href="/portrait-image-sitemap.xml" prefetch={false}>View portrait image sitemap</Link></p>
    </main>
  );
}
