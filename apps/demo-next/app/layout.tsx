import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';

export const metadata: Metadata = {
  title: 'ACT Demo',
  description: 'Demo Next.js app for the ACT SDK monorepo',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
