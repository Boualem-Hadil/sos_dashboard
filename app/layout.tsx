import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { EmergencyProvider } from '@/context/EmergencyContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'SOS Algérie — Tableau de bord sécurité',
  description: 'Plateforme B2B de gestion des urgences industrielles pour les entreprises algériennes.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body style={{ background: '#0A0A0A', color: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>
        <EmergencyProvider>
          {children}
        </EmergencyProvider>
      </body>
    </html>
  );
}
