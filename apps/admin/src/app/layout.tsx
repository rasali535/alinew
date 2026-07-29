import React from 'react';
import './globals.css';

export const metadata = {
  title: 'Ralion Platform — Empowered to Prosper | Ras Ali Labs',
  description: 'An AI-powered business operating system by Ras Ali Labs that helps organizations manage operations, automate workflows, connect with customers, and grow. Empowered to Prosper.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
