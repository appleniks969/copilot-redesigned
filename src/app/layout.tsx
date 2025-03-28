import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../ui/styles/globals.css';
import { ClientProviders } from '@/ui/components/layout/providers/ClientProviders';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GitHub Copilot Metrics Dashboard',
  description: 'Track and visualize Copilot usage metrics for your GitHub organization',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
