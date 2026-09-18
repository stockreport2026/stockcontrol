import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Stock Control System',
  description: 'Stock Control and Financial Reporting System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
