'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, AlertTriangle, Heart, Settings, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/workers', label: 'Travailleurs', icon: Users },
  { href: '/emergencies', label: 'Urgences', icon: AlertTriangle },
  { href: '/medical-profiles', label: 'Profils Médicaux', icon: Heart },
  { href: '/settings', label: 'Paramètres', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-64 min-h-screen flex flex-col" style={{ background: '#111111', borderRight: '1px solid #222' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5" style={{ borderBottom: '1px solid #222' }}>
        <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: '#E53935' }}>
          <ShieldAlert className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="font-bold text-white text-base leading-tight">SOS Algérie</div>
          <div className="text-xs" style={{ color: '#808080' }}>Sécurité Industrielle</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3">
        <div className="text-xs font-semibold uppercase tracking-widest px-3 mb-3" style={{ color: '#555' }}>Navigation</div>
        <ul className="flex flex-col gap-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    active
                      ? 'text-white'
                      : 'hover:text-white'
                  )}
                  style={active
                    ? { background: 'rgba(229,57,53,0.15)', color: '#E53935', borderLeft: '3px solid #E53935' }
                    : { color: '#808080' }
                  }
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-6 py-4" style={{ borderTop: '1px solid #222' }}>
        <div className="text-xs" style={{ color: '#555' }}>SOS Algérie v2.0</div>
        <div className="text-xs" style={{ color: '#444' }}>© 2025 Tous droits réservés</div>
      </div>
    </aside>
  );
}
