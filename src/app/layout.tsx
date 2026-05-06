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
  metadataBase: new URL('https://kith-chat.vercel.app'), // Replace with actual production URL
  title: {
    default: 'kith - Connecting You Simply',
    template: '%s | kith',
  },
  description: 'A modern, real-time chat application for private and group conversations. Secure, aesthetic, and professional messaging.',
  keywords: ['chat', 'messaging', 'real-time', 'kith', 'communication', 'group chat', 'professional messenger'],
  authors: [{ name: 'kith Team' }],
  creator: 'kith',
  publisher: 'kith',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://kith-chat.vercel.app',
    siteName: 'kith',
    title: 'kith - Connecting You Simply',
    description: 'A modern, real-time chat application for private and group conversations.',
    images: [
      {
        url: '/icon.svg',
        width: 512,
        height: 512,
        alt: 'kith - Professional Messenger',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'kith - Connecting You Simply',
    description: 'A modern, real-time chat application for private and group conversations.',
    images: ['/icon.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'kith',
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
                  const theme = localStorage.getItem('kith-theme') || 'system';
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
                navigator.worker = navigator.serviceWorker.register('/sw.js').then(function(reg) {
                  // SW registered
                }).catch(function(err) {
                  // SW registration failed
                });
                
                navigator.serviceWorker.register('/firebase-messaging-sw.js').then(function(reg) {
                  // FCM SW registered
                }).catch(function(err) {
                  // FCM SW registration failed
                });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
