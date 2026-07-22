'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, AlertTriangle, Heart, Settings, ShieldAlert, Shield } from 'lucide-react';
import { getAuth } from '@/lib/auth';
import { useState, useEffect } from 'react';

const navItems = [
  { href: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/workers', label: 'Travailleurs', icon: Users },
  { href: '/emergencies', label: 'Urgences', icon: AlertTriangle },
  { href: '/medical-profiles', label: 'Profils Médicaux', icon: Heart },
  { href: '/settings', label: 'Paramètres', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    setIsSuperAdmin(auth?.role === 'super_admin');
  }, []);

  return (
    <aside
      className="w-60 flex-shrink-0 flex flex-col h-full"
      style={{
        background: 'var(--sos-sidebar-bg)',
        borderRight: '1px solid var(--sos-sidebar-border)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-5 py-4"
        style={{ borderBottom: '1px solid var(--sos-sidebar-border)' }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--sos-accent)' }}
        >
          <ShieldAlert className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-bold text-sm leading-tight" style={{ color: 'var(--sos-sidebar-text-active)' }}>
            SOS Algérie
          </div>
          <div className="text-xs" style={{ color: 'var(--sos-sidebar-text)' }}>
            Sécurité Industrielle
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3">
        <div
          className="text-xs font-semibold uppercase tracking-widest px-2 mb-3"
          style={{ color: 'var(--sos-sidebar-text)', opacity: 0.6 }}
        >
          Navigation
        </div>
        <ul className="flex flex-col gap-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
                  style={active
                    ? {
                        background: 'var(--sos-sidebar-active-bg)',
                        color: 'var(--sos-accent)',
                        borderLeft: '2px solid var(--sos-accent)',
                        paddingLeft: '10px',
                      }
                    : {
                        color: 'var(--sos-sidebar-text)',
                        borderLeft: '2px solid transparent',
                      }
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Super Admin Link — only visible to super_admin */}
      {isSuperAdmin && (
        <div className="px-3 pb-2">
          <div className="text-xs font-semibold uppercase tracking-widest px-2 mb-2" style={{ color: '#6366F1', opacity: 0.8 }}>Super Admin</div>
          <Link
            href="/admin"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
            style={pathname.startsWith('/admin')
              ? { background: 'rgba(99,102,241,0.15)', color: '#818CF8', borderLeft: '2px solid #6366F1', paddingLeft: '10px' }
              : { color: '#6366F1', borderLeft: '2px solid transparent' }
            }
          >
            <Shield className="w-4 h-4 flex-shrink-0" />
            Panneau Admin
          </Link>
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-4" style={{ borderTop: '1px solid var(--sos-sidebar-border)' }}>
        <div className="text-xs" style={{ color: 'var(--sos-sidebar-text)', opacity: 0.7 }}>SOS Algérie v2.0</div>
        <div className="text-xs" style={{ color: 'var(--sos-sidebar-text)', opacity: 0.4 }}>© 2025 Tous droits réservés</div>
      </div>
    </aside>
  );
}
