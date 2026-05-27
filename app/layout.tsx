import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OTAS — Online Thesis Archive & Supervision',
  description:
    'Web-based undergraduate project supervision, assessment, and archive management system.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
