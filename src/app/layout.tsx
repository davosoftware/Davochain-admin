import type { Metadata } from 'next';
import { Geist, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

/*
 * Geist for UI, the face of the shadcn dashboards this admin follows (28 Oct
 * 2026). JetBrains Mono for figures — its zero is slashed and its digits are
 * unmistakable at small sizes, which matters when the number is a balance.
 * (The CSS variable keeps its old name so nothing else has to change.)
 */
const sans = Geist({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});
const mono = JetBrains_Mono({
  variable: '--font-mono-face',
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Davochain Admin',
  description: 'Treasury, gates, and oversight for the Davochain exchange.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${mono.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
