import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter'
});

export const metadata: Metadata = {
  title: 'Medical Reporting Platform',
  description: 'Enterprise-grade self-funded medical and pharmacy reporting with C&E analytics',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-base-950 text-text-dark`}>
        {children}
      </body>
    </html>
  );
}
