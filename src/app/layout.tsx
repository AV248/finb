import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FINB · Fake International Bank',
  description:
    'FINB — Fake International Bank (ESTD. 2024, Platinum edition). A fictional, installable game-bank: earn Credits, grow Liberals, unlock six card tiers and play 2–13 player party rooms. No real money, no real banking.',
  applicationName: 'FINB',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'FINB',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192' }],
  },
  keywords: ['FINB', 'game bank', 'fictional banking', 'PWA game', 'credits', 'liberals', 'multiplayer party game'],
  authors: [{ name: 'FINB' }],
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#0b1024',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh bg-[#070a18] text-cream-100 antialiased">
        {children}
        <noscript>
          <div style={{ padding: 24, fontFamily: 'system-ui', color: '#fff' }}>
            FINB — Fake International Bank — is an installable progressive web app. Please enable JavaScript to open the vault.
          </div>
        </noscript>
      </body>
    </html>
  );
}
