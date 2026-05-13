'use client';
import { useRouter } from 'next/navigation';
import { LogOut, Bell, User } from 'lucide-react';
import { logout, getAuth } from '@/lib/auth';
import { useEmergency } from '@/context/EmergencyContext';

export function Navbar() {
  const router = useRouter();
  const { liveCount } = useEmergency();
  const user = getAuth();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="h-16 flex items-center justify-between px-6" style={{ background: '#111111', borderBottom: '1px solid #222' }}>
      <div>
        <div className="font-semibold text-white">{user?.companyName ?? 'SOS Algérie'}</div>
        <div className="text-xs" style={{ color: '#808080' }}>Tableau de bord de sécurité industrielle</div>
      </div>
      <div className="flex items-center gap-4">
        {/* Bell */}
        <div className="relative">
          <button className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors" style={{ background: '#1A1A1A' }}>
            <Bell className="w-5 h-5" style={{ color: '#808080' }} />
          </button>
          {liveCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold text-white badge-pulse" style={{ background: '#E53935', fontSize: '10px' }}>
              {liveCount}
            </span>
          )}
        </div>

        {/* User */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: '#1A1A1A' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: '#E53935' }}>
            <User className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-medium text-white">{user?.name ?? 'Utilisateur'}</div>
            <div className="text-xs" style={{ color: '#808080' }}>{user?.role ?? 'Admin'}</div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
          style={{ background: 'rgba(229,57,53,0.1)', color: '#E53935', border: '1px solid rgba(229,57,53,0.3)' }}
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </header>
  );
}
