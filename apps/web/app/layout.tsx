import type { Metadata } from 'next';
import './globals.css';

const siteUrl = 'https://flowkit.digitaladexpert.de';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'FlowKit — Teach Your Browser Repetitive Work',
    template: '%s — FlowKit',
  },
  description:
    'FlowKit records your repetitive browser tasks and replays them automatically. AI-powered workflow automation for everyone.',
  keywords: [
    'browser automation', 'workflow recorder', 'task automation',
    'chrome extension', 'AI automation', 'replay automation',
    'no-code automation', 'web automation',
  ],
  authors: [{ name: 'Digital Ad Expert', url: 'https://digitaladexpert.de' }],
  alternates: { canonical: siteUrl },
  openGraph: {
    title: 'FlowKit — Teach Your Browser Repetitive Work',
    description: 'Record browser workflows and replay them automatically. AI-powered suggestions included.',
    type: 'website',
    url: siteUrl,
    siteName: 'FlowKit',
    images: [{ url: `${siteUrl}/og-image.png`, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FlowKit — Browser Automation for Everyone',
    description: 'Record. Replay. Automate. Free Chrome Extension.',
    site: '@DigitalExpertDE',
    images: [`${siteUrl}/og-image.png`],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
