import type {Metadata, Viewport} from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { cn } from '@/lib/utils';
import Script from 'next/script';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://kith.chat'),
  title: {
    default: 'kith - Friendly Messaging',
    template: '%s | kith',
  },
  description: 'A vibrant, modern space for friendly conversations. Secure, aesthetic, and fun.',
  keywords: ['chat', 'messaging', 'kith', 'social', 'friendly', 'PWA'],
  authors: [{ name: 'kith' }],
  creator: 'kith',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://kith.chat',
    siteName: 'kith',
    title: 'kith - Friendly Messaging',
    description: 'Vibrant messaging for a fun world.',
    images: [
      {
        url: '/icon.svg',
        width: 512,
        height: 512,
        alt: 'kith Logo',
      },
    ],
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#FFB5A7',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(inter.variable, plusJakarta.variable)} suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('kith-theme') || 'dark';
                  const html = document.documentElement;
                  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (isDark) {
                    html.classList.add('dark');
                  } else {
                    html.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="font-body antialiased bg-background text-foreground overflow-hidden">
        <FirebaseClientProvider>
          {children}
          <Toaster />
        </FirebaseClientProvider>
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(reg => {
                  console.log('KITH Service Worker Registered');
                }).catch(err => {
                  console.error('SW registration failed:', err);
                });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}