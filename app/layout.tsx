import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { EmergencyProvider } from '@/context/EmergencyContext';
import { ThemeProvider } from '@/context/ThemeContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'SOS Algérie — Tableau de bord sécurité',
  description: 'Plateforme B2B de gestion des urgences industrielles pour les entreprises algériennes.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} dark`}>
      <body>
        <ThemeProvider>
          <EmergencyProvider>
            {children}
          </EmergencyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
