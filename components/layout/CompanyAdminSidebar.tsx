'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShieldCheck, Users, Layers, Bell, History, Settings } from 'lucide-react';

const CA_ACCENT = '#0EA5E9'; // sky-500 — distinguishes from safety_officer's red
const CA_ACCENT_BG = 'rgba(14,165,233,0.12)';
const CA_ACCENT_BORDER = '#0EA5E9';

const navItems = [
  { href: '/company-admin',               label: 'Vue d\'ensemble',  icon: LayoutDashboard },
  { href: '/company-admin/officers',       label: 'Agents de sécu.', icon: ShieldCheck },
  { href: '/company-admin/workers',        label: 'Travailleurs',    icon: Users },
  { href: '/company-admin/departments',    label: 'Départements',    icon: Layers },
  { href: '/company-admin/notifications',  label: 'Notifications',   icon: Bell },
  { href: '/company-admin/history',        label: 'Historique',      icon: History },
  { href: '/company-admin/settings',       label: 'Paramètres',      icon: Settings },
];

export function CompanyAdminSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/company-admin') return pathname === '/company-admin';
    return pathname.startsWith(href);
  }

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
        className="flex items-center justify-center py-3"
        style={{ borderBottom: '1px solid var(--sos-sidebar-border)', padding: '10px 12px' }}
      >
        <Image
          src="/logo-dark.png"
          alt="EchoAlert"
          width={220}
          height={80}
          priority
          style={{ objectFit: 'contain', width: '100%', height: 'auto' }}
        />
      </div>

      {/* Role badge */}
      <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--sos-sidebar-border)' }}>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: CA_ACCENT_BG, border: `1px solid ${CA_ACCENT_BORDER}30` }}>
          <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: CA_ACCENT }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: CA_ACCENT }}>
            Admin Entreprise
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3">
        <div className="text-xs font-semibold uppercase tracking-widest px-2 mb-3" style={{ color: 'var(--sos-sidebar-text)', opacity: 0.5 }}>
          Navigation
        </div>
        <ul className="flex flex-col gap-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
                  style={active
                    ? { background: CA_ACCENT_BG, color: CA_ACCENT, borderLeft: `2px solid ${CA_ACCENT}`, paddingLeft: '10px' }
                    : { color: 'var(--sos-sidebar-text)', borderLeft: '2px solid transparent' }
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

      {/* Footer */}
      <div className="px-5 py-4" style={{ borderTop: '1px solid var(--sos-sidebar-border)' }}>
        <div className="text-xs" style={{ color: 'var(--sos-sidebar-text)', opacity: 0.7 }}>EchoAlert v2.0</div>
        <div className="text-xs" style={{ color: 'var(--sos-sidebar-text)', opacity: 0.4 }}>© 2025 Tous droits réservés</div>
      </div>
    </aside>
  );
}
