export const metadata = {
  title: 'Fine Art Portrait Image Sitemap',
  robots: { index: false, follow: true }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
