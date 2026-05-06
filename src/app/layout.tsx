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
    default: 'kith - Connecting You Simply',
    template: '%s | kith',
  },
  description: 'A modern, real-time chat application for professional and private conversations. Secure, aesthetic, and reliable messaging.',
  keywords: ['chat', 'messaging', 'real-time', 'kith', 'communication', 'professional messenger'],
  authors: [{ name: 'kith' }],
  creator: 'kith',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://kith.chat',
    siteName: 'kith',
    title: 'kith - Connecting You Simply',
    description: 'Modern messaging for a connected world.',
    images: [
      {
        url: '/icon.svg',
        width: 512,
        height: 512,
        alt: 'kith Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'kith - Connecting You Simply',
    description: 'Modern messaging for a connected world.',
    images: ['/icon.svg'],
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#3B82F6',
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
                navigator.serviceWorker.register('/sw.js').catch(function(err) {
                  console.error('SW registration failed:', err);
                });
                
                navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(function(err) {
                  console.error('FCM SW registration failed:', err);
                });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
