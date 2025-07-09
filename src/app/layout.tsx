import { Inter } from 'next/font/google';

import type { Metadata } from 'next';

import './globals.css';
import I18nInitializer from '@/components/common/I18nInitializer'; // Import the initializer
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/auth-context';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'CodeMap',
  description:
    'Visualize and understand your codebases with AI-powered concept maps.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body className={`${inter.variable} font-body antialiased`}>
        <I18nInitializer /> {/* Add the initializer here */}
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
